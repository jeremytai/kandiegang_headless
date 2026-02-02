/**
 * AnimatedHeadline.tsx
 * Reusable headline with split-type character reveal and color fill animation.
 * Vertica-style: chars slide up on scroll, then color flows
 * light grey → signal yellow → headline color.
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

const COLOR_LIGHT_GREY = '#d1d5db';
const COLOR_SIGNAL_YELLOW = '#FFF200';
const COLOR_HEADLINE = '#46519C'; // --color-secondary-purple-rain

export type AnimatedHeadlineProps = {
  text: string;
  as?: React.ElementType;
  className?: string;
  colorAfterReveal?: boolean;
};

export function AnimatedHeadline({
  text,
  as: Tag = 'h2',
  className = '',
  colorAfterReveal = true,
}: AnimatedHeadlineProps) {
  const headlineRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;

    const split = new SplitType(el, {
      types: 'lines, words, chars',
      lineClass: 'animated-headline-line',
    });

    if (!split.chars?.length) {
      split.revert();
      return;
    }

    split.lines?.forEach((line) => {
      (line as HTMLElement).style.overflow = 'hidden';
    });

    gsap.set(split.chars, {
      yPercent: 100,
      opacity: 0,
      color: COLOR_LIGHT_GREY,
    });

    const revealTween = gsap.to(split.chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.02,
      color: COLOR_LIGHT_GREY,
      paused: true,
    });

    const colorTimeline = gsap.timeline({
      paused: true,
      delay: colorAfterReveal ? 0.85 : 0,
      onComplete: () => {
        split.chars?.forEach((char) => {
          (char as HTMLElement).style.color = '';
        });
      },
    });
    colorTimeline
      .to(split.chars, {
        color: COLOR_SIGNAL_YELLOW,
        duration: 0.25,
        stagger: 0.02,
        ease: 'power2.inOut',
      })
      .to(split.chars, {
        color: COLOR_HEADLINE,
        duration: 0.4,
        ease: 'power2.inOut',
      });

    const play = () => {
      revealTween.play();
      colorTimeline.play();
    };

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      once: true,
      onEnter: play,
    });

    // If headline is already in view on load (e.g. hero above fold), play after layout
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
          play();
        }
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      split.revert();
      revealTween.kill();
      colorTimeline.kill();
      st.kill();
    };
  }, [text, colorAfterReveal]);

  return (
    <Tag
      ref={headlineRef as React.RefObject<HTMLHeadingElement>}
      data-split="heading"
      aria-label={text}
      className={className}
      style={{
        lineHeight: 1.1,
        overflow: 'hidden',
        display: 'inline-block',
      }}
    >
      {text}
    </Tag>
  );
}

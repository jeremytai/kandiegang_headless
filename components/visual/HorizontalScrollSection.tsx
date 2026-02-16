/**
 * HorizontalScrollSection.tsx
 *
 * A scroll-driven horizontal panel viewer inspired by Sunday.ai
 *
 * Behavior:
 * - Scrolls vertically until section reaches top of viewport
 * - Section becomes sticky, vertical scroll drives horizontal translation
 * - After last panel is visible, vertical scrolling resumes
 *
 * Technical approach:
 * - Uses position: sticky (no scroll hijacking)
 * - Pure CSS + RAF for smooth animation
 * - No body overflow manipulation
 * - GPU-accelerated transforms
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Panel {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface HorizontalScrollSectionProps {
  panels: Panel[];
  className?: string;
}

export const HorizontalScrollSection: React.FC<HorizontalScrollSectionProps> = ({
  panels,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({
    containerHeight: 0,
    maxTranslateX: 0,
  });

  const rafRef = useRef<number | null>(null);

  /**
   * Calculate dimensions for scroll math
   *
   * Formula:
   * - maxTranslateX = trackWidth - viewportWidth (how far we need to translate)
   * - containerHeight = maxTranslateX + viewportHeight (total scroll distance needed)
   */
  const calculateDimensions = useCallback(() => {
    if (!trackRef.current) return;

    const trackWidth = trackRef.current.scrollWidth;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxTranslateX = Math.max(0, trackWidth - viewportWidth);
    const containerHeight = maxTranslateX + viewportHeight;

    setDimensions({ containerHeight, maxTranslateX });
  }, []);

  /**
   * Update horizontal translation based on scroll position
   *
   * Math:
   * 1. Get section top position
   * 2. Calculate scroll progress: (scrollY - sectionTop) / maxTranslateX
   * 3. Clamp between 0 and 1
   * 4. Apply: translateX = -progress * maxTranslateX
   */
  const updateTransform = useCallback(() => {
    if (!containerRef.current || !trackRef.current || dimensions.maxTranslateX === 0) return;

    const sectionTop = containerRef.current.offsetTop;
    const scrollY = window.scrollY;

    // Calculate progress (0 to 1)
    const progress = Math.max(0, Math.min(1, (scrollY - sectionTop) / dimensions.maxTranslateX));

    // Apply transform (GPU-accelerated)
    const translateX = -progress * dimensions.maxTranslateX;
    trackRef.current.style.transform = `translate3d(${translateX}px, 0, 0)`;
  }, [dimensions.maxTranslateX]);

  /**
   * RAF-based scroll handler for 60fps performance
   */
  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(updateTransform);
  }, [updateTransform]);

  /**
   * Recalculate on resize
   */
  useEffect(() => {
    calculateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      calculateDimensions();
    });

    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateDimensions]);

  /**
   * Attach scroll listener
   */
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll]);

  // Use Tailwind for dynamic height and will-change, avoid inline styles
  const sectionHeightClass =
    dimensions.containerHeight > 0 ? `!h-[${dimensions.containerHeight}px]` : 'min-h-screen';
  return (
    <section ref={containerRef} className={`relative ${className} ${sectionHeightClass}`}>
      <div ref={stickyRef} className="sticky top-0 h-screen overflow-hidden will-change-transform">
        <div ref={trackRef} className="flex h-full gap-6 px-6 w-max will-change-transform">
          {panels.map((panel) => (
            <article
              key={panel.id}
              className="relative flex-none w-[90vw] md:w-[60vw] lg:w-[50vw] h-[80vh] rounded-xl overflow-hidden bg-slate-900 text-white"
            >
              <img
                src={panel.imageUrl}
                alt={panel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end h-full p-8 md:p-12">
                <h3 className="text-3xl md:text-5xl font-light mb-4">{panel.title}</h3>
                <p className="text-lg opacity-90">{panel.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * ========================================
 * USAGE EXAMPLE
 * ========================================
 */

export const ExampleUsage: React.FC = () => {
  const panels: Panel[] = [
    {
      id: '1',
      title: 'First Panel',
      description: 'This is the first panel',
      imageUrl: 'https://via.placeholder.com/1200x800',
    },
    {
      id: '2',
      title: 'Second Panel',
      description: 'This is the second panel',
      imageUrl: 'https://via.placeholder.com/1200x800',
    },
    {
      id: '3',
      title: 'Third Panel',
      description: 'This is the third panel',
      imageUrl: 'https://via.placeholder.com/1200x800',
    },
    {
      id: '4',
      title: 'Fourth Panel',
      description: 'This is the fourth panel',
      imageUrl: 'https://via.placeholder.com/1200x800',
    },
  ];

  return (
    <div>
      {/* Content before */}
      <div className="h-screen bg-gray-100">Scroll down to see the horizontal section</div>

      {/* Horizontal scroll section */}
      <HorizontalScrollSection panels={panels} className="bg-purple-900" />

      {/* Content after */}
      <div className="h-screen bg-gray-200">Content continues after horizontal section</div>
    </div>
  );
};

/**
 * ========================================
 * SCROLL MATH EXPLANATION
 * ========================================
 *
 * Given:
 * - trackWidth = total width of all panels + gaps
 * - viewportWidth = window.innerWidth
 * - viewportHeight = window.innerHeight
 *
 * Calculate:
 * - maxTranslateX = trackWidth - viewportWidth
 *   (how far we need to move left to show all panels)
 *
 * - containerHeight = maxTranslateX + viewportHeight
 *   (total vertical scroll distance needed)
 *
 * On scroll:
 * - sectionTop = distance from document top to section start
 * - scrollY = current vertical scroll position
 * - scrollIntoSection = scrollY - sectionTop
 *
 * - progress = scrollIntoSection / maxTranslateX
 *   (clamped 0-1)
 *
 * - translateX = -progress * maxTranslateX
 *   (negative because we move left)
 *
 * Result:
 * - At progress = 0: translateX = 0 (first panel visible)
 * - At progress = 1: translateX = -maxTranslateX (last panel visible)
 * - Linear mapping: vertical scroll → horizontal movement
 *
 * ========================================
 * PERFORMANCE CONSIDERATIONS
 * ========================================
 *
 * ✅ GPU Acceleration:
 * - Uses transform: translate3d() for GPU rendering
 * - willChange: transform hints browser
 *
 * ✅ No Layout Thrashing:
 * - Reads (offsetTop, scrollY) before writes (transform)
 * - RAF batches updates to 60fps
 * - No getBoundingClientRect() in scroll handler
 *
 * ✅ Passive Listeners:
 * - scroll listener is passive: true
 * - No preventDefault(), allows browser optimization
 *
 * ✅ Memory Safety:
 * - Cleanup: removes listeners, cancels RAF
 * - ResizeObserver disconnected on unmount
 *
 * ✅ Minimize Re-renders:
 * - Uses refs for DOM access (not state)
 * - Dimensions only update on resize
 * - Transform applied directly to DOM (not React state)
 *
 * ========================================
 * OPTIONAL ENHANCEMENTS
 * ========================================
 *
 * 1. Snap to panels:
 *    - Calculate panel positions
 *    - Round progress to nearest panel
 *    - Add CSS scroll-snap-type
 *
 * 2. Reduced motion:
 *    - Check prefers-reduced-motion
 *    - Disable horizontal scroll, show panels vertically
 *
 * 3. Touch support:
 *    - Add touch handlers
 *    - Prevent default on touchmove during horizontal phase
 *
 * 4. Momentum smoothing:
 *    - Use spring physics (Framer Motion useSpring)
 *    - Smooth out translateX changes
 *
 * 5. Progress indicators:
 *    - Show dots for each panel
 *    - Highlight active based on progress
 *
 * 6. SSR safety:
 *    - Check typeof window !== 'undefined'
 *    - Return placeholder during SSR
 */

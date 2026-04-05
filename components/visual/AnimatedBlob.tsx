/**
 * AnimatedBlob.tsx
 * Vertica-style animated blob background (noise + goo-filtered gradient blobs).
 * Cursor-following blob with static blobs; themed with secondary Blush and palette.
 * On mobile (matches global CSS hide), narrow viewports, Safari/reduced-motion, or
 * hidden tabs: skips infinite RAF + SVG filters for performance.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useLightMotionBackdrop } from '../../hooks/useLightMotionBackdrop';
import './animated-blob.css';

type AnimatedBlobProps = {
  /** When true, fills the parent (absolute); when false, fixed full viewport. */
  contained?: boolean;
};

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function isNarrowViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

export function AnimatedBlob({ contained = false }: AnimatedBlobProps) {
  const blobRef = useRef<HTMLDivElement>(null);
  const lightMotion = useLightMotionBackdrop();
  const isNarrow = useSyncExternalStore(subscribeNarrow, isNarrowViewport, () => false);

  useEffect(() => {
    if (isNarrow || lightMotion) return;

    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
    let targetX = x;
    let targetY = y;
    let rafId = 0;

    const speed = 0.08;

    const tick = () => {
      x += (targetX - x) * speed;
      y += (targetY - y) * speed;

      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const start = () => {
      cancelAnimationFrame(rafId);
      if (document.visibilityState === 'visible') {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        cancelAnimationFrame(rafId);
      }
    };

    start();
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isNarrow, lightMotion]);

  // Matches animated-blob.css: wrapper hidden on mobile — avoid SVG filters + perpetual RAF.
  if (isNarrow) {
    return null;
  }

  if (lightMotion) {
    return (
      <div
        className={`animated-blob-wrapper ${contained ? 'animated-blob-contained' : ''}`}
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-blush/35 via-secondary-purple-rain/25 to-primary-breath" />
      </div>
    );
  }

  return (
    <div
      className={`animated-blob-wrapper ${contained ? 'animated-blob-contained' : ''}`}
      aria-hidden
    >
      <svg className="animated-blob-noise" aria-hidden>
        <filter id="animatedBlobNoiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" stitchTiles="stitch" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#animatedBlobNoiseFilter)"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>

      <svg className="animated-blob-svg-blur" aria-hidden>
        <defs>
          <filter id="animatedBlobGoo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="animated-blob-interactive-container">
        <div className="animated-blob-gradients">
          <div className="animated-blob-g1" />
          <div className="animated-blob-g2" />
          <div className="animated-blob-g3" />
          <div className="animated-blob-g4" />
          <div className="animated-blob-g5" />
          <div ref={blobRef} className="animated-blob-interactive" />
        </div>
      </div>
    </div>
  );
}

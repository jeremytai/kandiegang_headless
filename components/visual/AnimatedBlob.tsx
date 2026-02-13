/**
 * AnimatedBlob.tsx
 * Vertica-style animated blob background (noise + goo-filtered gradient blobs).
 * Cursor-following blob with static blobs; themed with secondary Blush and palette.
 */

import { useEffect, useRef } from 'react';
import './animated-blob.css';

type AnimatedBlobProps = {
  /** When true, fills the parent (absolute); when false, fixed full viewport. */
  contained?: boolean;
};

export function AnimatedBlob({ contained = false }: AnimatedBlobProps) {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
    let targetX = x;
    let targetY = y;

    const speed = 0.08;

    const move = () => {
      x += (targetX - x) * speed;
      y += (targetY - y) * speed;

      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      requestAnimationFrame(move);
    };

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('mousemove', onMouseMove);
    move();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

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

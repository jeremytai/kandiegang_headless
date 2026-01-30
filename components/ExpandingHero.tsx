
/**
 * ExpandingHero.tsx
 * An immersive, scroll-driven hero component.
 * Features:
 * - Uses Framer Motion to animate a dynamic `clip-path` inset.
 * - As the user scrolls, a rounded image card expands to fill the entire viewport.
 * - This creates a smooth cinematic transition into the product details.
 * - Updated for better mobile responsiveness with wider initial insets.
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const ExpandingHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Calculate if we're on a small screen to adjust the expansion feel
  const entryProgress = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  
  // On mobile, calc(8vw) vs calc(4vw) on desktop for better visibility of the "card" state
  const clipPath = useTransform(entryProgress, (v) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const padding = isMobile ? '4vw' : '2vw';
    const radius = isMobile ? '32px' : '48px';
    return `inset(0px calc(${padding} * (1 - ${v})) round calc(${radius} * (1 - ${v})))`;
  });

  return (
    <section ref={containerRef} className="relative h-[150vh] md:h-[180vh] bg-primary-breath">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center overflow-hidden">
        <motion.div 
          style={{ 
            clipPath,
            width: "100%",
            height: "100vh"
          }}
          className="relative bg-secondary-purple-rain overflow-hidden flex flex-col"
        >
          <div className="relative flex-1 w-full h-full overflow-hidden">
            <img 
              src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/11/10163101/250401_kandiegang_seasonopener_abbett.jpg?w=2000&q=80&auto=format" 
              className="w-full h-full object-cover"
              alt="We provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without excluding men)."
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/5" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
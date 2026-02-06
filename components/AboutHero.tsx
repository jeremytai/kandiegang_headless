
/**
 * AboutHero.tsx
 * A high-impact hero section used specifically for branding and editorial pages.
 * Features:
 * - Large-scale typography overlay with staggered entrance animations.
 * - Dynamic video background with high-quality fallback image.
 * - Cinematic framing that emphasizes the product's advanced engineering.
 * - Responsive: Flexible height for better mobile presentation.
 */

import React from 'react';
import { motion } from 'framer-motion';

export const AboutHero: React.FC = () => {
  return (
    <section className="relative grid grid-rows-1 bg-white pt-[0.8rem] px-3 pb-3 min-h-0 md:min-h-[90vh] md:h-screen md:grid-cols-1 md:grid-rows-1 md:p-3">
      <div className="relative z-10 col-span-1 col-start-1 row-start-1 hidden flex-col justify-center p-4 py-12 md:flex md:justify-center md:p-6 md:py-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
        </motion.div>
      </div>

      <div className="col-span-1 col-start-1 row-start-1 min-h-[280px] h-full overflow-hidden rounded-xl bg-black md:min-h-[400px] md:h-full relative shadow-inner">
        <img
          src="https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/11/08124931/250621_kandiegang-19-2048x1365.jpg"
          alt="Kandie Gang"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/10" />
      </div>
    </section>
  );
};
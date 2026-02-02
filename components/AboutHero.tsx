
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
    <section className="relative grid grid-rows-2 bg-white p-3 min-h-[90vh] md:h-screen md:grid-cols-1 md:grid-rows-1">
      <div className="relative z-10 col-span-1 col-start-1 row-start-1 flex flex-col justify-center p-4 py-12 md:justify-center md:p-6 md:py-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="mx-auto pt-6 md:pt-10 text-5xl md:text-8xl lg:text-[10vw] font-bold tracking-tighter text-slate-900 leading-[0.8] mb-2 text-balance">
            Kandie Gang
          </h1>
          <h1 className="mx-auto text-5xl md:text-8xl lg:text-[10vw] font-bold tracking-tighter text-slate-400/80 leading-[0.8] text-balance">
            The helpful robotics company
          </h1>
        </motion.div>
      </div>

      <div className="col-span-1 col-start-1 min-h-[400px] h-full overflow-hidden rounded-xl bg-black md:row-start-1 md:h-full relative shadow-inner">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        >
          <source src="https://stream.mux.com/nO7qOC7BAVniKPLrWS2vr5HeKWj801jW00JhjJilIX8lQ.m3u8" type="application/x-mpegURL" />
          <img 
            src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop" 
            alt="Kandie Gang Robotics"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/10" />
      </div>
    </section>
  );
};
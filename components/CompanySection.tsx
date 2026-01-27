/**
 * CompanySection.tsx
 * Showcases the key team members building Kandie Gang.
 * Features:
 * - A high-fidelity, interactive team list.
 * - TeamLink component: Uses spring-based physics to make profile images follow the user's cursor on hover.
 * - Responsive grid that highlights the international presence of the team.
 */

import React, { useRef, useState } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';

const TeamLink: React.FC<{ name: string, url: string, image: string }> = ({ name, url, image }) => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);
  
  const springConfig = { damping: 25, stiffness: 200 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <a
      ref={containerRef}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative inline-flex cursor-pointer items-center justify-center gap-1 rounded-full border border-black/10 bg-transparent px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {name}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{ 
              position: 'absolute',
              left: mouseX,
              top: mouseY,
              pointerEvents: 'none',
              zIndex: 50,
              x: '-25%',
              y: '-110%', 
            }}
            className="hidden lg:block"
          >
            <div className="h-[140px] w-[140px] overflow-hidden rounded-full shadow-2xl border-4 border-white bg-white">
              <img
                alt={name}
                loading="lazy"
                width="140"
                height="140"
                className="h-full w-full object-cover"
                src={image}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </a>
  );
};

export const CompanySection: React.FC = () => {
  return (
    <section className="py-40 px-6 bg-white flex flex-col items-center">
      <div className="max-w-4xl w-full text-center">
         <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-12">The Builders</h3>
         <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
            <TeamLink 
               name="Alper Canberk" 
               url="https://x.com/alpercanbe" 
               image="https://cdn.sanity.io/images/1omys9i3/production/84d49f0478b48724371da3789368d6d002ee7dbb-1600x2400.jpg?rect=274,56,1141,1146&w=256&q=75" 
            />
            <TeamLink 
               name="Nikolas Olsson" 
               url="https://x.com/nikolasolsson" 
               image="https://picsum.photos/seed/nik/256/256" 
            />
            <TeamLink 
               name="Sarah Jenkins" 
               url="#" 
               image="https://picsum.photos/seed/sarah/256/256" 
            />
            <TeamLink 
               name="Marcus Zhao" 
               url="#" 
               image="https://picsum.photos/seed/marcus/256/256" 
            />
            <TeamLink 
               name="Elena Rodriguez" 
               url="#" 
               image="https://picsum.photos/seed/elena/256/256" 
            />
            <TeamLink 
               name="David Chen" 
               url="#" 
               image="https://picsum.photos/seed/david/256/256" 
            />
            <TeamLink 
               name="Lisa Müller" 
               url="#" 
               image="https://picsum.photos/seed/lisa/256/256" 
            />
            <TeamLink 
               name="Samir Kapoor" 
               url="#" 
               image="https://picsum.photos/seed/samir/256/256" 
            />
         </div>
         <p className="mt-20 text-slate-400 text-sm font-light">
            And 20+ more pioneers in Hamburg and San Francisco.
         </p>
      </div>
    </section>
  );
};
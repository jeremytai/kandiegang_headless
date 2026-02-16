import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  showScrollHint?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, showScrollHint = true }) => {
  return (
    <div className="mb-16 md:mb-24 lg:absolute lg:top-12 lg:left-0 lg:w-full px-4 md:px-8 lg:px-16 lg:z-20">
      <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-secondary-current text-balance">
        {title}
      </h2>
      {showScrollHint && (
        <div className="hidden lg:flex items-center gap-2 mt-4">
          <span className="uppercase tracking-widest text-secondary-current text-[10px]">
            Scroll down to explore
          </span>
          <ChevronRight className="w-4 h-4 text-secondary-current" />
        </div>
      )}
    </div>
  );
};

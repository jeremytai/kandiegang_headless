import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  showScrollHint?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, showScrollHint = true }) => {
  return (
    <div className="bg-secondary-purple-rain pt-8 md:pt-12 pb-4 md:pb-8 px-4 md:px-8 lg:px-16 lg:z-20">
      <div className="flex items-center gap-4 justify-between">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-secondary-current text-balance">
          {title}
        </h2>
        {showScrollHint && (
          <span className="hidden lg:flex items-center gap-2 ml-auto">
            <span className="uppercase tracking-widest text-secondary-current text-[10px]">
              Scroll down to explore
            </span>
            <ChevronRight className="w-4 h-4 text-secondary-current" />
          </span>
        )}
      </div>
    </div>
  );
};

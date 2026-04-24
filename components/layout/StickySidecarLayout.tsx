import React from 'react';

type StickySidecarLayoutProps = {
  main: React.ReactNode;
  sidecar: React.ReactNode;
  /** Desktop sidecar width. Defaults to 492px (existing ProductPage value). */
  sidecarWidthClassName?: string;
  /** Sticky top offset (e.g. header height CSS var). Defaults to var(--header-height,5rem). */
  stickyTopClassName?: string;
  /** Sticky height (usually viewport minus header). Defaults to calc(100vh - header height). */
  stickyHeightClassName?: string;
  className?: string;
  mainClassName?: string;
  sidecarClassName?: string;
  sidecarInnerClassName?: string;
};

export const StickySidecarLayout: React.FC<StickySidecarLayoutProps> = ({
  main,
  sidecar,
  sidecarWidthClassName = 'w-[492px] shrink-0',
  stickyTopClassName = 'top-[var(--header-height,5rem)]',
  stickyHeightClassName = 'h-[calc(100vh-var(--header-height,5rem))]',
  className = '',
  mainClassName = '',
  sidecarClassName = '',
  sidecarInnerClassName = '',
}) => {
  return (
    <div className={`hidden lg:flex ${className}`.trim()}>
      <div className={`min-w-0 flex-1 ${mainClassName}`.trim()}>{main}</div>
      <div className={`${sidecarWidthClassName} ${sidecarClassName}`.trim()}>
        <div className={`sticky ${stickyTopClassName} ${stickyHeightClassName}`.trim()}>
          <div className={`h-full ${sidecarInnerClassName}`.trim()}>{sidecar}</div>
        </div>
      </div>
    </div>
  );
};


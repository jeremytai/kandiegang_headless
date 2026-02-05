/**
 * OffCanvas.tsx
 * Slide-in panel from the right. Used for event CTA login, etc.
 * - Backdrop click and Escape close the panel.
 * - Locks body scroll and traps focus when open.
 */

import React, { useEffect, useRef } from "react";

export interface OffCanvasProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const OffCanvas: React.FC<OffCanvasProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`
          fixed inset-0 z-[90] bg-black/40 transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "offcanvas-title" : undefined}
        className={`
          fixed right-0 top-0 z-[100] h-full w-full sm:w-[420px] bg-white
          transform transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          ${open ? "translate-x-0" : "translate-x-full"}
          flex flex-col shadow-2xl
        `}
      >
        {title != null && (
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 id="offcanvas-title" className="text-lg font-semibold text-primary-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="text-2xl leading-none text-slate-500 hover:text-primary-ink hover:opacity-60"
            >
              ×
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </aside>
    </>
  );
};

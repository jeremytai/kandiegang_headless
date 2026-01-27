/**
 * Footer.tsx
 * A comprehensive global footer for the application.
 * Features:
 * - Multi-column layout with organized directory, social, and legal links.
 * - Dynamic current-year indicator.
 * - Interactive link elements with smooth hover effects (text shift and color change).
 * - Mobile-responsive structure that adjusts column distribution for vertical screens.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-white border-t border-slate-50 font-medium text-[13px]">
      <div className="flex min-h-[40vh] flex-col justify-between">
        <div className="grid grid-cols-12 gap-6 p-6 pb-12 md:pb-40">
          <div className="col-span-12 flex flex-col items-center py-16 md:col-span-6 md:items-start md:py-0">
            <p className="text-center md:text-left text-slate-900 tracking-tight text-base">
              Kandie Gang, the helpful robotics company
            </p>
          </div>

          <div className="col-span-12 grid grid-cols-6 gap-6 border-t border-slate-100 pt-8 md:col-span-6 md:border-t-0 md:pt-0">
            <ul className="col-span-3 flex flex-col gap-2 pb-4 md:col-span-2 md:gap-3">
              <li><p className="text-slate-900 uppercase tracking-widest text-[10px] font-bold mb-1">Explore</p></li>
              <FooterLink to="/community" label="Community" />
              <FooterLink to="/" label="Technology" />
              <FooterLink to="/stories" label="Journal" />
              <FooterLink to="/fonts" label="Fonts" />
            </ul>

            <ul className="col-span-3 flex flex-col gap-2 pb-4 md:col-span-2 md:gap-3">
              <li><p className="text-slate-900 uppercase tracking-widest text-[10px] font-bold mb-1">About</p></li>
              <FooterLink to="/about" label="Company" />
              <FooterLink to="/" label="Careers" />
              <FooterLink to="/" label="Beta Program" />
            </ul>

            <ul className="col-span-3 flex flex-col gap-2 pb-4 md:col-span-2 md:gap-3">
              <li><p className="text-slate-900 uppercase tracking-widest text-[10px] font-bold mb-1">Social</p></li>
              <li>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black block">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black block">
                  X (Twitter)
                </a>
              </li>
              <li>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black block">
                  YouTube
                </a>
              </li>
            </ul>

            <ul className="col-span-3 flex flex-col gap-2 pb-4 md:hidden">
              <li><p className="text-slate-900 uppercase tracking-widest text-[10px] font-bold mb-1">Legal</p></li>
              <FooterLink to="/" label="Terms of Service" />
              <FooterLink to="/" label="Privacy and Cookies" />
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 p-6 border-t border-slate-50">
          <div className="col-span-6 self-end lg:col-span-8">
            <p className="text-slate-400 tracking-tight">
              © {currentYear} Kandie Gang Inc
            </p>
          </div>
          
          <ul className="col-span-6 hidden md:flex md:flex-row md:gap-8 lg:col-span-4 justify-end">
            <li className="flex flex-col items-start self-end">
              <Link to="/" className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black whitespace-nowrap">
                Terms of Service
              </Link>
            </li>
            <li className="flex flex-col items-start self-end">
              <Link to="/" className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black whitespace-nowrap">
                Privacy and Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, label }: { to: string; label: string }) => (
  <li>
    <Link to={to} className="cursor-pointer text-slate-400 transition-all hover:pl-2 hover:text-black block">
      {label}
    </Link>
  </li>
);
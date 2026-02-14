/**
 * FontsPage.tsx
 * A comprehensive showcase of all fonts used in the application.
 * Features:
 * - Display of all font families (IvyOra Display Thin/Light/Regular, GTPlanar)
 * - All available weights and styles
 * - Sample text at various sizes
 * - Character set displays
 * - Usage examples
 */

import React from 'react';
import { motion } from 'framer-motion';

export const FontsPage: React.FC = () => {
  // Helper function to get font showcase class name
  const getFontClass = (family: string): string => {
    if (family === 'IvyOra Disp Thi') return 'font-showcase-ivyora-thin';
    if (family === 'IvyOra Disp Lt') return 'font-showcase-ivyora-light';
    if (family === 'IvyOra Disp Reg') return 'font-showcase-ivyora-regular';
    if (family === 'GTPlanar') return 'font-showcase-gt-planar';
    return '';
  };

  // Helper function to get font weight class
  const getFontWeightClass = (weight: number): string => {
    const weightMap: Record<number, string> = {
      250: 'font-weight-250',
      300: 'font-weight-300',
      400: 'font-weight-400',
      500: 'font-weight-500',
      600: 'font-weight-600',
      700: 'font-weight-700',
    };
    return weightMap[weight] || '';
  };

  // Helper function to get font style class
  const getFontStyleClass = (style: string): string => {
    return style === 'italic' ? 'font-style-italic' : 'font-style-normal';
  };

  const fontFamilies = [
    {
      name: 'IvyOra Disp Thi',
      description: 'Headings (Thin)',
      family: 'IvyOra Disp Thi',
      weights: [{ weight: 400, style: 'normal', label: 'Normal' }],
      sample: 'The quick brown fox jumps over the lazy dog',
      sizes: ['text-6xl', 'text-4xl', 'text-2xl', 'text-xl'],
      usage: 'Use var(--font-heading-thin) or .font-heading-thin for thin headings',
    },
    {
      name: 'IvyOra Disp Lt',
      description: 'Headings (Light)',
      family: 'IvyOra Disp Lt',
      weights: [{ weight: 400, style: 'normal', label: 'Normal' }],
      sample: 'The quick brown fox jumps over the lazy dog',
      sizes: ['text-6xl', 'text-4xl', 'text-2xl', 'text-xl'],
      usage: 'Use var(--font-heading-light) or .font-heading-light for light headings',
    },
    {
      name: 'IvyOra Disp Reg',
      description: 'Headings (Regular)',
      family: 'IvyOra Disp Reg',
      weights: [{ weight: 400, style: 'normal', label: 'Normal' }],
      sample: 'The quick brown fox jumps over the lazy dog',
      sizes: ['text-6xl', 'text-4xl', 'text-2xl', 'text-xl'],
      usage: 'Default heading font (h1–h6). Use var(--font-heading-regular) or .font-heading',
    },
    {
      name: 'GTPlanar',
      description: 'Body text and paragraphs',
      family: 'GTPlanar',
      weights: [
        { weight: 250, style: 'normal', label: '250' },
        { weight: 300, style: 'normal', label: 'Thin' },
        { weight: 300, style: 'italic', label: 'Thin Italic' },
        { weight: 400, style: 'normal', label: 'Regular' },
        { weight: 400, style: 'italic', label: 'Italic' },
        { weight: 700, style: 'normal', label: 'Bold' },
        { weight: 700, style: 'italic', label: 'Bold Italic' },
      ],
      sample: 'The quick brown fox jumps over the lazy dog. 1234567890',
      sizes: ['text-2xl', 'text-xl', 'text-lg', 'text-base'],
      usage: 'Used for all body text, paragraphs, and list items. Use var(--font-body)',
    },
  ];

  const characterSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    punctuation: '.,;:!?\'"()[]{}@#$%^&*-+=/\\|<>`~',
  };

  // Tailwind theme showcase additions
  const tailwindColors = [
    { name: 'primary-breath', value: 'bg-primary-breath text-primary-ink' },
    { name: 'primary-ecru', value: 'bg-primary-ecru text-primary-ink' },
    { name: 'primary-ink', value: 'bg-primary-ink text-white' },
    { name: 'secondary-purple-rain', value: 'bg-secondary-purple-rain text-white' },
    { name: 'secondary-current', value: 'bg-secondary-current text-white' },
    { name: 'secondary-blush', value: 'bg-secondary-blush text-primary-ink' },
    { name: 'secondary-drift', value: 'bg-secondary-drift text-white' },
    { name: 'secondary-signal', value: 'bg-secondary-signal text-primary-ink' },
  ];
  const spacings = ['p-2', 'p-4', 'p-8', 'm-2', 'm-4', 'm-8', 'gap-2', 'gap-4', 'gap-8'];
  const borderRadius = ['rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'];
  const shadows = ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-none'];
  const sampleButtons = [
    { label: 'Primary', className: 'bg-primary-breath text-primary-ink font-heading px-6 py-3 rounded-lg shadow-md hover:bg-primary-ecru' },
    { label: 'Secondary', className: 'bg-secondary-drift text-white font-body px-6 py-3 rounded-lg shadow hover:bg-secondary-blush' },
    { label: 'Accent', className: 'bg-secondary-signal text-primary-ink font-heading px-6 py-3 rounded-full shadow-lg hover:bg-secondary-purple-rain' },
  ];
  const sampleCards = [
    { title: 'Card 1', className: 'bg-primary-breath border border-primary-ecru rounded-xl shadow-md p-8', text: 'This is a sample card using Tailwind theme colors.' },
    { title: 'Card 2', className: 'bg-secondary-blush border border-secondary-current rounded-2xl shadow-lg p-8', text: 'Another card with secondary colors and shadow.' },
  ];
  const sampleAlerts = [
    { type: 'Info', className: 'bg-secondary-drift text-white border-l-4 border-secondary-current p-4 rounded-md shadow', text: 'This is an info alert.' },
    { type: 'Warning', className: 'bg-secondary-signal text-primary-ink border-l-4 border-secondary-blush p-4 rounded-md shadow', text: 'This is a warning alert.' },
  ];
  return (
    <div className="bg-white min-h-screen py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
<h1 className="text-h1 font-heading mb-6 text-primary-ink">
            Typography Showcase
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">
            A comprehensive display of all fonts used throughout the Kandie Gang website
          </p>
        </motion.div>
        {/* Tailwind Colors */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Tailwind Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {tailwindColors.map((color) => (
              <div key={color.name} className={`rounded-xl p-6 border shadow-md ${color.value}`}> 
                <div className="text-lg font-bold mb-2">{color.name}</div>
                <div className="text-sm font-mono">{color.value.replace(/bg-|text-/g, '')}</div>
                <div className="mt-4 text-lg font-bold">Sample</div>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Spacing</h2>
          <div className="flex flex-wrap gap-8">
            {spacings.map((spacing) => (
              <div key={spacing} className={`bg-primary-ecru text-primary-ink rounded-md ${spacing} min-w-[120px] min-h-[40px]`}>
                <span className="font-mono">{spacing}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Border Radius</h2>
          <div className="flex flex-wrap gap-8">
            {borderRadius.map((radius) => (
              <div key={radius} className={`bg-primary-blush text-primary-ink ${radius} p-8 font-mono shadow-md min-w-[120px] min-h-[40px]`}>
                {radius}
              </div>
            ))}
          </div>
        </section>

        {/* Shadows */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Shadows</h2>
          <div className="flex flex-wrap gap-8">
            {shadows.map((shadow) => (
              <div key={shadow} className={`bg-secondary-current text-white rounded-lg p-8 font-mono ${shadow} min-w-[120px] min-h-[40px]`}>
                {shadow}
              </div>
            ))}
          </div>
        </section>

        {/* Sample Buttons */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Sample Buttons</h2>
          <div className="flex flex-wrap gap-8">
            {sampleButtons.map((btn) => (
              <button key={btn.label} className={btn.className}>{btn.label}</button>
            ))}
          </div>
        </section>

        {/* Sample Cards */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Sample Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sampleCards.map((card) => (
              <div key={card.title} className={card.className}>
                <div className="text-xl font-bold mb-2">{card.title}</div>
                <div className="text-base font-body">{card.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sample Alerts */}
        <section className="mb-32">
          <h2 className="text-4xl font-bold mb-8 text-primary-ink">Sample Alerts</h2>
          <div className="flex flex-wrap gap-8">
            {sampleAlerts.map((alert) => (
              <div key={alert.type} className={alert.className}>
                <div className="font-bold mb-2">{alert.type}</div>
                <div>{alert.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Font Families */}
        {fontFamilies.map((font, index) => (
          <motion.section
            key={font.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-32"
          >
            <div className="border-b border-slate-200 pb-8 mb-12">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 mb-3">
                {font.name}
              </h2>
              <p className="text-lg text-slate-500 font-light">{font.description}</p>
              <p className="text-sm text-slate-400 mt-2 font-mono">font-family: '{font.family}'</p>
              <p className="text-sm text-slate-400 mt-1">Usage: {font.usage}</p>
            </div>

            {/* Weights and Styles */}
            <div className="space-y-16 mb-16">
              {font.weights.map((weight, _weightIndex) => (
                <div key={`${weight.weight}-${weight.style}`} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
                      {weight.label} ({weight.weight}){weight.style === 'italic' && ' • Italic'}
                    </span>
                    <code className="text-xs text-slate-400 font-mono">
                      font-weight: {weight.weight}; font-style: {weight.style};
                    </code>
                  </div>

                  {/* Size Samples */}
                  <div className="space-y-6">
                    {font.sizes.map((size, sizeIndex) => (
                      <div key={sizeIndex} className="border-l-4 border-[#f9f100] pl-6">
                        <div className="flex items-baseline gap-4 mb-2">
                          <span className="text-xs font-mono text-slate-400 min-w-[80px]">
                            {size}
                          </span>
                          <span
                            className={`${size} ${getFontClass(font.family)} ${getFontWeightClass(weight.weight)} ${getFontStyleClass(weight.style)}`}
                          >
                            {font.sample}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Character Set */}
            <div className="bg-slate-50 rounded-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Character Set</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Uppercase
                  </p>
                  <p className={`text-2xl ${getFontClass(font.family)}`}>
                    {characterSets.uppercase}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Lowercase
                  </p>
                  <p className={`text-2xl ${getFontClass(font.family)}`}>
                    {characterSets.lowercase}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Numbers
                  </p>
                  <p className={`text-2xl ${getFontClass(font.family)}`}>{characterSets.numbers}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Punctuation
                  </p>
                  <p className={`text-xl ${getFontClass(font.family)}`}>
                    {characterSets.punctuation}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        ))}

        {/* CSS Variables Reference */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-32 bg-slate-900 text-white rounded-3xl p-12"
        >
          <h2 className="text-4xl font-bold mb-8">CSS Variables</h2>
          <div className="space-y-4 font-mono text-sm">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 mb-2">CSS Custom Properties:</div>
              <div className="space-y-2 text-slate-200">
                <div>
                  <span className="text-[#f9f100]">--font-heading-thin:</span> "IvyOra Disp Thi",
                  sans-serif
                </div>
                <div>
                  <span className="text-[#f9f100]">--font-heading-light:</span> "IvyOra Disp Lt",
                  sans-serif
                </div>
                <div>
                  <span className="text-[#f9f100]">--font-heading-regular:</span> "IvyOra Disp Reg",
                  sans-serif
                </div>
                <div>
                  <span className="text-[#f9f100]">--font-body:</span> "GTPlanar", "GTPlanar
                  Fallback", sans-serif
                </div>
                <div>
                  <span className="text-[#f9f100]">--font-size:</span> 16px
                </div>
                <div>
                  <span className="text-[#f9f100]">--font-weight:</span> 300
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 mb-2">Utility Classes:</div>
              <div className="space-y-2 text-slate-200">
                <div>
                  <span className="text-[#f9f100]">.font-heading</span> - Default heading (IvyOra
                  Disp Reg)
                </div>
                <div>
                  <span className="text-[#f9f100]">.font-headline</span> - Same as
                  --font-heading-regular
                </div>
                <div>
                  <span className="text-[#f9f100]">.font-subheadline</span> - Same as --font-body
                  (GTPlanar)
                </div>
                <div>
                  <span className="text-[#f9f100]">.font-body</span> - Body text (GTPlanar)
                </div>
                <div>
                  <span className="text-[#f9f100]">.subheadline</span> - Subheadlines (GTPlanar)
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Usage Examples */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-32"
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 mb-12">
            Usage Examples
          </h2>
          <div className="space-y-16">
            {/* Headline Example */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Headline (IvyOra Disp Reg)
              </h3>
              <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
                <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-slate-900 mb-4 font-heading">
                  Say hello to Kandie Gang.
                </h1>
                <p className="text-sm text-slate-500 font-mono">
                  &lt;h1 className="text-6xl font-bold font-heading"&gt;
                </p>
              </div>
            </div>

            {/* Subheadline Example */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Subheadline (GTPlanar)
              </h3>
              <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
                <h2 className="text-3xl md:text-4xl font-subheadline font-bold text-slate-900 mb-4">
                  Built for busy households
                </h2>
                <p className="text-sm text-slate-500 font-mono">
                  &lt;h2 className="font-subheadline"&gt;
                </p>
              </div>
            </div>

            {/* Body Text Example */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Body Text (GTPlanar)
              </h3>
              <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
                <p className="text-lg md:text-xl text-slate-700 leading-relaxed font-light mb-4 font-body">
                  We believe that robots belong in our homes. Not just to perform tasks, but to
                  unlock human potential by removing the burden of repetitive chores.
                </p>
                <p className="text-sm text-slate-500 font-mono">
                  &lt;p&gt; (automatically uses GTPlanar via --font-body)
                </p>
              </div>
            </div>

            {/* Mixed Example */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Mixed Typography
              </h3>
              <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
                <h1 className="text-5xl font-bold tracking-tighter text-slate-900 mb-4 font-heading">
                  The Future of Home Robotics
                </h1>
                <h2 className="text-2xl font-subheadline font-bold text-slate-700 mb-6">
                  Powered by state-of-the-art AI
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed font-light mb-4 font-body">
                  Kandie Gang simplifies the complexities of daily life through intelligent
                  automation and elegant design.
                </p>
                <p className="text-base text-slate-500 italic leading-relaxed font-body">
                  Every aspect is designed to blend into your living space while providing maximum
                  utility.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

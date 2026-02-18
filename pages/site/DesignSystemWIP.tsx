/**
 * DesignSystemWIP.tsx
 * A comprehensive showcase of all fonts, colors, and styles used in the application.
 * Features:
 * - Display of all font families (IvyOra Display Thin/Light/Regular, GTPlanar)
 * - All available weights and styles
 * - Sample text at various sizes
 * - Character set displays
 * - Usage examples
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Accordion } from '../../components/common/Accordion';

export const DesignSystemWIP: React.FC = () => {
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
  const borderRadius = [
    'rounded',
    'rounded-md',
    'rounded-lg',
    'rounded-xl',
    'rounded-2xl',
    'rounded-3xl',
    'rounded-full',
  ];
  const shadows = [
    'shadow-sm',
    'shadow',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',
    'shadow-2xl',
    'shadow-inner',
    'shadow-none',
  ];
  const sampleButtons = [
    {
      label: 'Primary',
      className:
        'bg-primary-breath text-primary-ink font-heading px-6 py-3 rounded-lg shadow-md hover:bg-primary-ecru',
    },
    {
      label: 'Secondary',
      className:
        'bg-secondary-drift text-white font-body px-6 py-3 rounded-lg shadow hover:bg-secondary-blush',
    },
    {
      label: 'Accent',
      className:
        'bg-secondary-signal text-primary-ink font-heading px-6 py-3 rounded-full shadow-lg hover:bg-secondary-purple-rain',
    },
  ];
  const sampleCards = [
    {
      title: 'Card 1',
      className: 'bg-primary-breath border border-primary-ecru rounded-xl shadow-md p-8',
      text: 'This is a sample card using Tailwind theme colors.',
    },
    {
      title: 'Card 2',
      className: 'bg-secondary-blush border border-secondary-current rounded-2xl shadow-lg p-8',
      text: 'Another card with secondary colors and shadow.',
    },
  ];
  const sampleAlerts = [
    {
      type: 'Info',
      className:
        'bg-secondary-drift text-white border-l-4 border-secondary-current p-4 rounded-md shadow',
      text: 'This is an info alert.',
    },
    {
      type: 'Warning',
      className:
        'bg-secondary-signal text-primary-ink border-l-4 border-secondary-blush p-4 rounded-md shadow',
      text: 'This is a warning alert.',
    },
  ];
  const magicLinkPreviewRef = useRef<HTMLDivElement>(null);
  const [magicLinkHtml, setMagicLinkHtml] = useState('');
  useEffect(() => {
    if (magicLinkPreviewRef.current) {
      const html = magicLinkPreviewRef.current.innerHTML;
      setMagicLinkHtml((prev) => (prev === html ? prev : html));
    }
  });

  return (
    <div className="bg-white min-h-screen py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-h1 font-heading mb-6 text-primary-ink">Design System WIP</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">
            Building out a design system for Kandie Gang line-by-line.
          </p>
        </motion.div>
        {/* Tailwind Colors */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Tailwind Colors</h2>
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
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Spacing</h2>
          <div className="flex flex-wrap gap-8">
            {spacings.map((spacing) => (
              <div
                key={spacing}
                className={`bg-primary-ecru text-primary-ink rounded-md ${spacing} min-w-[120px] min-h-[40px]`}
              >
                <span className="font-mono">{spacing}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Border Radius</h2>
          <div className="flex flex-wrap gap-8">
            {borderRadius.map((radius) => (
              <div
                key={radius}
                className={`bg-primary-blush text-primary-ink ${radius} p-8 font-mono shadow-md min-w-[120px] min-h-[40px]`}
              >
                {radius}
              </div>
            ))}
          </div>
        </section>

        {/* Shadows */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Shadows</h2>
          <div className="flex flex-wrap gap-8">
            {shadows.map((shadow) => (
              <div
                key={shadow}
                className={`bg-secondary-current text-white rounded-lg p-8 font-mono ${shadow} min-w-[120px] min-h-[40px]`}
              >
                {shadow}
              </div>
            ))}
          </div>
        </section>

        {/* Sample Buttons */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Sample Buttons</h2>
          <div className="flex flex-wrap gap-8">
            {sampleButtons.map((btn) => (
              <button key={btn.label} type="button" className={btn.className}>
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sample Cards */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Sample Cards</h2>
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
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Sample Alerts</h2>
          <div className="flex flex-wrap gap-8">
            {sampleAlerts.map((alert) => (
              <div key={alert.type} className={alert.className}>
                <div className="font-bold mb-2">{alert.type}</div>
                <div>{alert.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Accordion Example */}
        <section className="mb-32">
          <h2 className="text-4xl font-normal mb-8 text-primary-ink">Accordion Example</h2>
          <div className="bg-secondary-purple-rain rounded-xl p-8">
            <Accordion
              items={[
                {
                  title: 'What is Kandie Gang?',
                  content: (
                    <span>
                      Kandie Gang is a cycling community focused on inclusivity, fun, and adventure.
                      We welcome riders of all backgrounds and skill levels.
                    </span>
                  ),
                },
                {
                  title: 'How do I join a ride?',
                  content: (
                    <span>
                      Check our events calendar and sign up for any ride that fits your schedule.
                      All details are provided on the event page.
                    </span>
                  ),
                },
                {
                  title: 'What should I bring?',
                  content: (
                    <span>
                      Bring your bike, helmet, water, and a positive attitude! Some rides may have
                      specific requirements, so check the event details.
                    </span>
                  ),
                },
              ]}
            />
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
              <h2 className="text-4xl md:text-6xl font-normal tracking-tighter text-slate-900 mb-3">
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
                    <span className="text-xs font-normal uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
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
              <h3 className="text-xl font-normal text-slate-900">Character Set</h3>
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
          <h2 className="text-4xl font-normal mb-8">CSS Variables</h2>
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
          <h2 className="text-4xl md:text-6xl font-normal tracking-normal text-slate-900 mb-12">
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
            {/* Emails Section */}
            <div className="space-y-4 mt-20">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Emails</h3>
              {/* Magic Link Email Example */}
              <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
                <h4 className="text-lg font-bold mb-4 text-primary-ink">Magic Link Email</h4>
                <div className="overflow-x-auto mb-6" ref={magicLinkPreviewRef}>
                  <table
                    border={0}
                    cellPadding="0"
                    cellSpacing="0"
                    width="100%"
                    style={{ minWidth: '100%', borderCollapse: 'collapse', margin: 0, padding: 0, textAlign: 'center', tableLayout: 'fixed', background: '#fafafc' }}
                  >
                    <tbody>
                      <tr>
                        <td align="center" style={{ padding: 0, background: '#fafafc' }}>
                          <table
                            border={0}
                            cellPadding="0"
                            cellSpacing="0"
                            width="100%"
                            style={{ minWidth: '100%', borderCollapse: 'collapse', margin: 0, padding: 0, textAlign: 'center', tableLayout: 'fixed', background: '#fafafc' }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: '24px 0 16px', background: '#fafafc' }}>
                                  <a href="https://kandiegang.com?supabase-magiclink" target="_blank" rel="noopener noreferrer">
                                    <img src="https://www.kandiegang.com/logos/kandiegang_logo_sunshine_pill.png" alt="Kandie Gang" style={{ display: 'block', width: 138, maxWidth: 138, margin: '0 auto' }} width="138" />
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <table
                            border={0}
                            cellPadding="0"
                            cellSpacing="0"
                            align="center"
                            style={{ width: '100%', maxWidth: 602, borderCollapse: 'separate', background: '#fffffe', borderRadius: 16, border: '1px solid #ddd', margin: '0 auto' }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: '40px 0', borderRadius: 16, background: '#fffffe' }}>
                                  <table
                                    border={0}
                                    cellPadding="0"
                                    cellSpacing="0"
                                    width="100%"
                                    align="center"
                                    style={{ maxWidth: 600, margin: '0 auto', borderCollapse: 'collapse' }}
                                  >
                                    <tbody>
                                      <tr>
                                        <td align="center" style={{ padding: '0 40px 20px', background: '#fffffe' }}>
                                          <h2 style={{ fontFamily: 'RoobertPRO, Helvetica, Arial, sans-serif', fontSize: 32, lineHeight: '40px', fontWeight: 'normal', margin: 0, color: '#1c1c1e' }}>
                                            Here’s your unique sign-in link to Kandie Gang
                                          </h2>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <table
                                    border={0}
                                    cellPadding="0"
                                    cellSpacing="0"
                                    width="100%"
                                    align="center"
                                    style={{ maxWidth: 600, margin: '0 auto', borderCollapse: 'collapse' }}
                                  >
                                    <tbody>
                                      <tr>
                                        <td align="center" style={{ padding: '0 40px', background: '#fffffe' }}>
                                          <p style={{ fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 16, lineHeight: '24px', color: '#1c1c1e', margin: 0 }}>
                                            You’re almost there! To access your Kandie Gang account, simply click on the button below.
                                          </p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td align="center" style={{ padding: '20px 0 0 0', background: '#fffffe' }}></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <table
                                    border={0}
                                    cellPadding="0"
                                    cellSpacing="0"
                                    width="100%"
                                    align="center"
                                    style={{ maxWidth: 600, margin: '0 auto', borderCollapse: 'collapse' }}
                                  >
                                    <tbody>
                                      <tr>
                                        <td align="center" style={{ padding: '0 40px', background: '#fffffe' }}>
                                          <table border={0} cellPadding="0" cellSpacing="0" align="center" style={{ borderCollapse: 'collapse' }}>
                                            <tbody>
                                              <tr>
                                                <td align="center">
                                                  <a style={{ display: 'inline-block', fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 16, lineHeight: '24px', color: '#fffefe', backgroundColor: '#3859ff', textDecoration: 'none', padding: '11px 16px 13px', borderRadius: 4, textAlign: 'center', fontWeight: 'bold' }} href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer">
                                                    <span>Login to my Kandie Gang account</span>
                                                  </a>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td align="center" style={{ padding: '20px 0 0 0', background: '#fffffe' }}></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <table
                            border={0}
                            cellPadding="0"
                            cellSpacing="0"
                            align="center"
                            style={{ width: '100%', maxWidth: 600, borderCollapse: 'collapse', margin: '0 auto' }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: '60px 0 0 0', background: '#fafafc' }}></td>
                              </tr>
                              <tr>
                                <td align="center" style={{ padding: '0 40px 24px 40px', background: '#fafafc' }}>
                                  <p style={{ fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 14, lineHeight: '20px', margin: 0, color: '#1c1c1e', textDecoration: 'none' }}>
                                    If you didn’t try to login via password-less authentication, simply ignore this message. In case of any concerns, please contact our support.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style={{ padding: '0 40px 40px 40px', background: '#fafafc' }}>
                                  <p style={{ fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 14, lineHeight: '20px', margin: 0, color: '#1c1c1e', textDecoration: 'none' }}>
                                    This email was sent to <a style={{ fontWeight: 'bold', textDecoration: 'none', color: '#3859ff' }} href="mailto:your@email.com" target="_blank" rel="noopener noreferrer">your@email.com</a>.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style={{ padding: '0 40px 24px 40px', background: '#fafafc' }}>
                                  <a href="https://kandiegang.com" target="_blank" rel="noopener noreferrer">
                                    <img src="https://www.kandiegang.com/logos/kandiegang_logo_sunshine_pill.png" alt="Kandie Gang" style={{ display: 'block', width: 138, maxWidth: 138, margin: '0 auto' }} width="138" />
                                  </a>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style={{ padding: '0 40px', fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 14, lineHeight: '20px', color: '#1c1c1e', textDecoration: 'none' }}>
                                  <span>Kandie Gang<br />Hamburg, Germany</span><br />
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style={{ padding: '0 40px', fontFamily: 'NotoSans, Helvetica, Arial, sans-serif', fontSize: 14, lineHeight: '20px', color: '#1c1c1e!important', textDecoration: 'none' }}>
                                  <span><a style={{ fontWeight: 'bold', textDecoration: 'none', color: '#3859ff' }} href="https://www.kandiegang.com/privacy-policy?supabase-magiclink" target="_blank" rel="noopener noreferrer">Privacy Policy</a> | <a style={{ fontWeight: 'bold', textDecoration: 'none', color: '#3859ff' }} href="https://www.kandiegang.com/about?supabase-magiclink" target="_blank" rel="noopener noreferrer">About Us</a></span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Copyable Code Block */}
                <div className="mt-6 relative w-full max-w-none">
                  <button
                    type="button"
                    aria-label="Copy code"
                    className="absolute top-2 right-2 p-1 rounded hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(magicLinkHtml);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="7" width="9" height="9" rx="2" stroke="#fff" strokeWidth="1.5" fill="none"/>
                      <rect x="7.5" y="4" width="7.5" height="7.5" rx="2" stroke="#fff" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                  <pre className="bg-slate-900 text-white text-xs rounded-lg p-4 overflow-x-auto select-all max-h-64 text-[11px] leading-snug w-full">
{magicLinkHtml}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

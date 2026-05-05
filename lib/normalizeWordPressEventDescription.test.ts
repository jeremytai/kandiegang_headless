import { describe, it, expect } from 'vitest';
import { normalizeWordPressEventDescription } from './normalizeWordPressEventDescription';

describe('normalizeWordPressEventDescription', () => {
  it('strips NBSP and zero-width / BOM / word-joiner characters', () => {
    const input = 'Hello\u00A0world\u200B!\uFEFF';
    expect(normalizeWordPressEventDescription(input)).toBe('Hello world!');
  });

  it('converts en-dash and em-dash line-start markers to markdown list hyphens', () => {
    const input = '\u2013 First line\n\u2014 Second';
    expect(normalizeWordPressEventDescription(input)).toBe('- First line\n- Second');
  });

  it('converts middle dot and bullet punctuation to list hyphens at line start', () => {
    expect(normalizeWordPressEventDescription('• one\n· two')).toBe('- one\n- two');
  });

  it('normalizes unicode bullets (U+2022, U+2023) and spaced hyphens at line start', () => {
    const input = '\u2022 a\n\u2023 b\n  - c';
    expect(normalizeWordPressEventDescription(input)).toBe('- a\n- b\n- c');
  });

  it('normalizes numbered markers using ) or . after the number', () => {
    expect(normalizeWordPressEventDescription('1) alpha\n2. beta\n3)gamma')).toBe(
      '1. alpha\n2. beta\n3. gamma'
    );
    expect(normalizeWordPressEventDescription('  10)\t\tten')).toBe('10. ten');
  });

  it('converts <br> and paragraph tags to newlines', () => {
    expect(normalizeWordPressEventDescription('a<br>b')).toBe('a\nb');
    expect(normalizeWordPressEventDescription('a<BR/>b')).toBe('a\nb');
    expect(normalizeWordPressEventDescription('<p>One</p><p>Two</p>')).toBe('One\n\nTwo');
    expect(normalizeWordPressEventDescription('<p>x</p>')).toBe('x');
  });

  it('inserts a blank line before a list only when the previous line is not already a list item', () => {
    const input = 'Intro line\n- item one\n- item two';
    expect(normalizeWordPressEventDescription(input)).toBe('Intro line\n\n- item one\n- item two');
  });

  it('collapses three or more consecutive newlines to at most two', () => {
    expect(normalizeWordPressEventDescription('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeWordPressEventDescription('a\r\nb\rc')).toBe('a\nb\nc');
  });
});

# Fonts Directory

Place your font files here. This directory is served as static assets by Vite.

## Font File Structure

Organize fonts by family:

```text
public/fonts/
  ├── fonts.css (font declarations)
  ├── gt-pressure/
  │   └── GT-Pressure-Bold.woff2 (or .woff)
  ├── gt-pressure-mono/
  │   ├── GT-Pressure-Mono-Regular.woff2
  │   └── GT-Pressure-Mono-Bold.woff2
  └── cambon/
      ├── Cambon-Regular.woff2
      ├── Cambon-Italic.woff2
      ├── Cambon-Medium.woff2
      ├── Cambon-SemiBold.woff2
      └── Cambon-Bold.woff2
```


## Font Usage

- **GT-Pressure Bold**: Headlines (h1, h2, h3, etc.)
- **GT-Pressure Mono**: Subheadlines (use `.subheadline` class)
- **Cambon**: Body text and paragraphs

## CSS Classes

- `.font-headline` - Apply GT-Pressure Bold
- `.font-subheadline` - Apply GT-Pressure Mono
- `.font-body` - Apply Cambon

## Font Formats

- **WOFF2** (recommended): Best compression, modern browsers
- **WOFF**: Good fallback
- **TTF/OTF**: Larger files, use as last resort

## Notes

- Files in `public/` are copied as-is to the build output
- Reference fonts with `/fonts/...` path (leading slash is important)
- Use `font-display: swap` for better performance
- Update `fonts.css` if you have different font file names

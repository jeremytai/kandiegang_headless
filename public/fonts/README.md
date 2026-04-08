# Fonts Directory

Static assets for the site and for **`/api/event-share`** (branded PNG). Declarations live in `fonts.css`.

## Required for event share PNG (commit these)

Vercel Edge loads them from the same origin as the site:

- `ivy-ora/IvyOraDispLight.ttf`
- `gt-planar/GTPlanarRegular.ttf`

`npm run build` runs `verify:share-fonts` first if either is missing.

## Layout (IvyOra + GTPlanar)

```text
public/fonts/
  ├── fonts.css
  ├── ivy-ora/   # IvyOra Display (Thin, Light, Regular) — .woff2 and/or .ttf
  └── gt-planar/ # GTPlanar weights — .woff2 and/or .ttf
```

## Font usage (site)

- **IvyOra Display**: headings — see `index.css` / Tailwind `font-heading-*`
- **GTPlanar**: body — `--font-body`, `.font-body`

## Font Formats

- **WOFF2** (recommended): Best compression, modern browsers
- **WOFF**: Good fallback
- **TTF/OTF**: Larger files, use as last resort

## Notes

- Files in `public/` are copied as-is to the build output
- Reference fonts with `/fonts/...` path (leading slash is important)
- Use `font-display: swap` for better performance
- Update `fonts.css` if you have different font file names

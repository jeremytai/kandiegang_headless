# Font Setup Instructions

## Step 1: Add Your Font Files

Place your font files in the following directories:

### GT-Pressure Bold (Headlines)

```text
public/fonts/gt-pressure/
  └── GT-Pressure-Bold.woff2  (or .woff)
```

### GT-Pressure Mono (Subheadlines)

```text
public/fonts/gt-pressure-mono/
  ├── GT-Pressure-Mono-Regular.woff2  (or .woff)
  └── GT-Pressure-Mono-Bold.woff2     (or .woff)
```

### Cambon (Body/Paragraphs)

```text
public/fonts/cambon/
  ├── Cambon-Regular.woff2     (or .woff)
  ├── Cambon-Italic.woff2     (or .woff) - optional
  ├── Cambon-Medium.woff2      (or .woff) - optional
  ├── Cambon-SemiBold.woff2    (or .woff) - optional
  └── Cambon-Bold.woff2        (or .woff) - optional
```


## Step 2: Update fonts.css (if needed)

If your font file names are different, update `public/fonts/fonts.css` to match your actual file names.

## Step 3: Verify

The fonts are automatically applied:

- **Headlines (h1, h2, h3, etc.)**: GT-Pressure Bold
- **Subheadlines**: GT-Pressure Mono (use `.subheadline` class)
- **Body text**: Cambon

## Font Usage Examples

### In React Components

```tsx
// Headlines automatically use GT-Pressure Bold
<h1>This is a headline</h1>

// Subheadlines use GT-Pressure Mono
<h2 className="subheadline">This is a subheadline</h2>

// Body text automatically uses Cambon
<p>This is body text</p>

// Or use utility classes
<div className="font-headline">GT-Pressure Bold</div>
<div className="font-subheadline">GT-Pressure Mono</div>
<div className="font-body">Cambon</div>
```

## Notes

- Fonts will fall back to system fonts if files are missing
- WOFF2 format is recommended for best performance
- The dev server will automatically reload when you add font files

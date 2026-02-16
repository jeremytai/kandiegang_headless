# Horizontal Scroll Implementation Guide

## Overview

Three implementations of the Sunday.ai-style horizontal scrolling interaction:

1. **Vanilla React** (`HorizontalScrollSection.tsx`) - Pure React + RAF
2. **Framer Motion** (`HorizontalScrollSectionFramer.tsx`) - Declarative approach
3. **Current Implementation** (`HorizontalRevealSection.tsx`) - Complex with scroll-jacking

## Comparison

| Feature | Vanilla | Framer Motion | Current (Scroll-jacking) |
|---------|---------|---------------|--------------------------|
| **Bundle Size** | ~2kb | ~42kb | ~5kb + Framer |
| **Performance** | Excellent | Good | Poor (event hijacking) |
| **Code Complexity** | Medium | Low | Very High |
| **Maintainability** | High | High | Low |
| **Browser Compat** | Excellent | Good | Good |
| **Scroll Behavior** | Native | Native | Hijacked |
| **Mobile Support** | Native | Native | Custom handlers |
| **Accessibility** | Native | Native | Requires work |

## Technical Approaches

### 1. Vanilla React (Recommended)

**Pros:**
- No dependencies beyond React
- Full control over performance
- Native scroll behavior preserved
- Small bundle size
- Easy to debug

**Cons:**
- More code to write
- Manual RAF management
- Need to handle edge cases

**Use when:**
- Bundle size matters
- Maximum performance needed
- Want full control

### 2. Framer Motion

**Pros:**
- Very clean, declarative code
- Built-in spring physics
- Automatic RAF handling
- Type-safe MotionValues

**Cons:**
- +40kb bundle size
- Less control over perf
- Overkill for this feature alone

**Use when:**
- Already using Framer Motion
- Want declarative API
- Don't need micro-optimizations

### 3. Current Implementation (Not Recommended)

**Problems:**
- Hijacks wheel/touch events
- Manipulates `body.overflow`
- Complex scroll-jacking logic
- Hard to maintain
- Breaks native scroll
- Accessibility issues

**Why it's problematic:**
```typescript
// ❌ Bad: Prevents default scroll
window.addEventListener('wheel', onWheel, { passive: false });
e.preventDefault();

// ❌ Bad: Locks body scroll
document.body.style.overflow = 'hidden';

// ✅ Good: Let browser handle scroll
// Just translate based on scroll position
```

## Migration Path

### From Current → Vanilla React

1. Remove scroll-jacking logic (lines 129-217)
2. Remove body overflow manipulation
3. Use sticky positioning + transform
4. Let browser handle scroll naturally

```typescript
// Before (complex)
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  cardsRow.scrollLeft += e.deltaY;
};

// After (simple)
const translateX = -progress * maxTranslateX;
trackRef.current.style.transform = `translate3d(${translateX}px, 0, 0)`;
```

### From Current → Framer Motion

Even simpler - just use `useScroll` + `useTransform`:

```typescript
const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ['start start', 'end end'],
});

const x = useTransform(scrollYProgress, [0, 1], [0, -maxTranslateX]);

return <motion.div style={{ x }}>{panels}</motion.div>;
```

## Scroll Math Explained

### The Problem

We need to map **vertical scroll distance** → **horizontal translation**.

### The Solution

```typescript
// Given:
const trackWidth = 4000;        // Total width of all panels
const viewportWidth = 1920;     // Browser width
const viewportHeight = 1080;    // Browser height

// Calculate:
const maxTranslateX = trackWidth - viewportWidth; // = 2080px
// This is how far left we need to move to show all panels

// Container height must accommodate this:
const containerHeight = maxTranslateX + viewportHeight; // = 3160px
// This gives us enough vertical scroll to drive horizontal movement

// On scroll:
const sectionTop = containerRef.offsetTop;  // Distance to section
const scrollY = window.scrollY;             // Current scroll
const scrollIntoSection = scrollY - sectionTop;

// Progress (0 to 1):
const progress = scrollIntoSection / maxTranslateX; // 0 → 1

// Apply:
const translateX = -progress * maxTranslateX; // 0 → -2080px
```

### Visual Example

```
Viewport: [----1920px----]
Track:    [--------4000px--------]
          ^                      ^
          Start                  End

Need to move: 4000 - 1920 = 2080px left

Scroll distance needed: 2080px + 1080px = 3160px
```

## Performance Optimization

### 1. GPU Acceleration

```css
/* ✅ Good: GPU-accelerated */
transform: translate3d(-1000px, 0, 0);
will-change: transform;

/* ❌ Bad: CPU layout */
margin-left: -1000px;
```

### 2. Avoid Layout Thrashing

```typescript
// ✅ Good: Read then write
const top = element.offsetTop;      // Read
element.style.transform = '...';    // Write

// ❌ Bad: Interleaved
element.style.transform = '...';    // Write
const top = element.offsetTop;      // Read (forces layout)
```

### 3. RAF Batching

```typescript
// ✅ Good: One update per frame
const handleScroll = () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(updateTransform);
};

// ❌ Bad: Multiple updates per frame
const handleScroll = () => {
  updateTransform(); // Could fire 10x per frame
};
```

### 4. Passive Listeners

```typescript
// ✅ Good: Let browser optimize
window.addEventListener('scroll', handler, { passive: true });

// ❌ Bad: Blocks optimization
window.addEventListener('scroll', handler, { passive: false });
```

## Edge Cases Handled

### 1. Resize

```typescript
const resizeObserver = new ResizeObserver(calculateDimensions);
resizeObserver.observe(trackRef.current);
```

### 2. Dynamic Content

ResizeObserver automatically recalculates when panels change size.

### 3. SSR Safety

```typescript
if (typeof window === 'undefined') return null;
```

### 4. Cleanup

```typescript
useEffect(() => {
  // Setup
  return () => {
    // Cleanup: remove listeners, cancel RAF
  };
}, []);
```

## Accessibility Considerations

### Keyboard Navigation

Native scroll is keyboard-accessible by default:
- `Arrow Down` / `Space` scrolls vertically
- `Page Down` scrolls by page
- `Home` / `End` jump to start/end

### Screen Readers

Add ARIA labels:

```tsx
<section aria-label="Horizontal scrolling panels">
  <div role="list">
    {panels.map(panel => (
      <article role="listitem" aria-label={panel.title}>
        {/* content */}
      </article>
    ))}
  </div>
</section>
```

### Reduced Motion

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Disable horizontal scroll, show panels vertically
  return <VerticalLayout panels={panels} />;
}
```

## Testing Checklist

- [ ] Scrolls smoothly at 60fps
- [ ] Works on resize
- [ ] Works with dynamic content
- [ ] No console errors
- [ ] No memory leaks
- [ ] Works with keyboard
- [ ] Works on mobile
- [ ] Respects reduced motion
- [ ] SSR compatible
- [ ] Last panel aligns perfectly

## Recommended Approach

For **Kandie Gang**, I recommend:

1. **Short term**: Use Framer Motion version
   - You're already using it
   - Quick to implement
   - Clean, maintainable

2. **Long term**: Migrate to Vanilla version
   - Remove Framer Motion dependency
   - Better performance
   - Smaller bundle

3. **Immediate**: Remove scroll-jacking
   - Current implementation has issues
   - Breaks native scroll behavior
   - Hard to maintain

## Implementation Steps

1. **Replace** `HorizontalRevealSection.tsx` with clean version
2. **Remove** scroll-jacking logic
3. **Remove** body overflow manipulation
4. **Test** on desktop and mobile
5. **Add** accessibility features
6. **Monitor** performance metrics

## Code Example

See the two new files:
- `components/visual/HorizontalScrollSection.tsx` (Vanilla)
- `components/visual/HorizontalScrollSectionFramer.tsx` (Framer Motion)

Both are production-ready and can be dropped in to replace the current implementation.

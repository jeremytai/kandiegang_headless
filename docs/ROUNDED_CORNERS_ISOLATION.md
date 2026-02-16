## Goal
Rollback to commit `37f46919d4ceca22c2ff1ca7a63ad87c6632842a` (known-good reference) and re-apply subsequent changes one-by-one to identify exactly which change caused rounded corners to disappear.

## Rollback target
- **Target commit**: `37f46919d4ceca22c2ff1ca7a63ad87c6632842a`

## Commits after target (apply in order)
- `fb87c7b` — Google Analytics integration + Preloader timing tweaks + `env.d.ts` gtag typing + `index.html` updates.
- `51f7381` — Preloader sessionStorage skip + width/height tweaks + image handling improvements + Tailwind build-step + `robots.txt`.

## Local WIP on main (do not lose)
- `12a3e33` — **WIP**: adjust frame rounding/padding for corner isolation (App frame: `rounded-3xl overflow-hidden p-3 md:p-4`, remove motion borderRadius style).

## Files changed since target (surface area)
- `App.tsx`
- `components/AboutHero.tsx`
- `components/ExpandingHero.tsx`
- `components/FAQSection.tsx`
- `components/HomepageRotatingHeadline.tsx`
- `components/HorizontalRevealSection.tsx`
- `components/Preloader.tsx`
- `env.d.ts`
- `index.html`
- `package.json`, `package-lock.json`
- `postcss.config.js` (new)
- `tailwind.config.js` (new)
- `public/robots.txt` (new)
- `pages/AboutPage.tsx`

## Suggested test checkpoints
After each cherry-pick, verify:
- **Frame corners**: the main white frame should show rounded corners.
- **Section corners**: `FAQSection` container and image should show `rounded-xl`.
- **Cards corners**: `HorizontalRevealSection` photos should show rounded corners.

## Commands (reference)
Create rollback branch:
```bash
git switch -c rounded-corners-isolation 37f46919d4ceca22c2ff1ca7a63ad87c6632842a
```

Apply commits one-by-one:
```bash
git cherry-pick fb87c7b
git cherry-pick 51f7381
```

Optionally test the local WIP frame tweak:
```bash
git cherry-pick 12a3e33
```


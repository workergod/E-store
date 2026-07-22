# Design Tokens

This file serves as the source of truth for E Store Pro's design tokens.

## 1. Principles
- **No Hardcoded Values**: Never use raw hex codes (e.g., `#0F7B46`) or raw pixel values (e.g., `17px`) in components.
- **CSS Variables**: All tokens are exposed as CSS variables in `:root` inside `src/index.css`.
- **Tailwind Integration**: All tokens are mapped in `tailwind.config.js`.

## 2. Token Categories
- **Colors**: Defined in `ColorGuide.md`
- **Typography**: Defined in `TypographyGuide.md`
- **Spacing**: Defined in `SpacingGuide.md`
- **Animation**: Defined in `AnimationGuide.md`

## 3. Shapes & Radii
- `--radius`: `20px` (Cards, Modals)
- `--radius-btn`: `14px` (Buttons, small containers)
- `--radius-input`: `16px` (Inputs, Selects, Search)

## 4. Shadows
- `--shadow-premium`: `0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)` (Primary elevation for cards)
- `--shadow-floating`: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)` (Subtle elevation for sidebars/headers)

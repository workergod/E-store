# Spacing Guide

We use a strict, mathematical spacing scale. No arbitrary margins or paddings are allowed.

## The Scale
All spacing maps to Tailwind CSS classes (`p-4`, `gap-8`, etc.) which correspond to the following pixel values:

| Value | Pixels | Use Case |
|-------|--------|----------|
| `4`   | 4px    | Micro-adjustments, icon gaps |
| `8`   | 8px    | Small gaps between related items |
| `12`  | 12px   | Inner padding for small buttons/inputs |
| `16`  | 16px   | Default component padding |
| `20`  | 20px   | Inner padding for search bars |
| `24`  | 24px   | **Card padding**, modal padding |
| `32`  | 32px   | **Section gap**, page padding |
| `40`  | 40px   | Major section dividers |
| `48`  | 48px   | Hero sections |
| `64`  | 64px   | Massive whitespace |

## Grid System
- **Page Width**: 100%
- **Content Max-Width**: 1800px
- **Grid Gap**: 32px
- **Card Gap**: 24px

### Responsive Behavior (Statistics/Cards)
- **Desktop/Ultrawide**: 4 columns (`grid-cols-4`)
- **Laptop**: 2 columns (`md:grid-cols-2`)
- **Tablet/Mobile**: 1 column (`grid-cols-1`)

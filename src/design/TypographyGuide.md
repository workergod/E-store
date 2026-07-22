# Typography Guide

## Font Family
- **Primary**: `Inter` (sans-serif)
- Fallbacks: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

## Hierarchy

| Level | Token Name | Size | Weight | Line Height | CSS Class |
|-------|------------|------|--------|-------------|-----------|
| 1 | Display | 40px | 700 (Bold) | 48px | `.text-display` |
| 2 | Page Title | 36px | 700 (Bold) | 44px | `.text-page-title` |
| 3 | Section Title | 24px | 600 (Semibold) | 32px | `.text-section-title` |
| 4 | Card Title | 18px | 600 (Semibold) | 28px | `.text-card-title` |
| 5 | Card Number | 34px | 700 (Bold) | 40px | `.text-card-number` |
| 6 | Subtitle | 16px | 400 (Regular) | 24px | `text-muted-foreground` |
| 7 | Body | 14px | 500 (Medium) | 20px | `.text-body` |
| 8 | Table Header | 14px | 600 (Semibold) | 20px | `font-semibold` |
| 9 | Caption | 12px | 400 (Regular) | 16px | `.text-caption` |

## Principles
- Never use sizes outside this scale.
- Maintain adequate line-height for readability.
- Use `text-muted-foreground` for secondary information to establish visual hierarchy without shrinking font size unnecessarily.

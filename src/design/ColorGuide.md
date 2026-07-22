# Color Guide

All colors are defined as CSS variables to support seamless Light, Dark, and System theme switching.

## Brand Colors
- **Primary**: `var(--primary)` (Default: `#0F7B46`)
- **Primary Dark**: `var(--primary-dark)` (Default: `#14532D`)

## Surface Colors
- **Background**: `var(--background)` (Default: `#F7F8FA`)
- **Card**: `var(--card)` (Default: `#FFFFFF`)
- **Popover**: `var(--popover)` (Modals, Dropdowns)

## Border & Inputs
- **Border**: `var(--border)` (Default: `#E8EBEF`)
- **Input**: `var(--input)` (Default: `#E8EBEF`)
- **Ring**: `var(--ring)` (Focus states, matching primary)

## Text Colors
- **Foreground (Primary)**: `var(--foreground)` (Default: `#111827`)
- **Muted Foreground (Secondary)**: `var(--muted-foreground)` (Default: `#6B7280`)

## Feedback States
- **Success**: `var(--success)` (`#10B981`)
- **Warning**: `var(--warning)` (`#F59E0B`)
- **Destructive**: `var(--destructive)` (`#EF4444`)

## Theming Rules
1. Never hardcode hex values in `.tsx` files.
2. Use Tailwind utility classes (`bg-primary`, `text-destructive`, `border-border`).
3. Ensure contrast ratios meet WCAG AA standards.

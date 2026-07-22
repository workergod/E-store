# Animation & Motion Guide

Consistent motion creates a premium, snappy feel. Never use arbitrary transition durations.

## Standard Durations

| Interaction | Duration | Tailwind Config | Usage |
|-------------|----------|-----------------|-------|
| **Hover** | 180ms | `duration-hover` | Buttons, Cards, Table Rows |
| **Dropdown**| 200ms | `duration-dropdown` | Select menus, User dropdowns |
| **Drawer** | 250ms | `duration-drawer` | Sidebars, Sliding panels |
| **Dialog** | 250ms | `duration-dialog` | Modals, Alerts |
| **Toast** | 300ms | `duration-toast` | Notifications |
| **Page** | 350ms | `duration-page` | Route transitions |
| **Charts** | 700ms | `duration-charts` | Recharts loading animations |
| **Counters**| 1000ms | `duration-counters` | Number counting up |

## Principles
- **Easing**: Default to `ease-out` for entering elements and `ease-in` for exiting elements.
- **Performance**: Only animate `transform` and `opacity` properties to avoid Layout Shifts (CLS).
- **Subtlety**: Hover effects should translate Y by no more than `-2px` (`-translate-y-0.5`).

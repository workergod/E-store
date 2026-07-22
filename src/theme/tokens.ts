import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { animations } from "./animations";
import { breakpoints } from "./breakpoints";
import { zIndex } from "./zIndex";

export const tokens = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  animations,
  breakpoints,
  zIndex,
} as const;

export type ThemeTokens = typeof tokens;

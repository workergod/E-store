export const animations = {
  durations: {
    hover: "180ms",
    button: "180ms",
    dropdown: "200ms",
    sidebar: "220ms",
    dialog: "250ms",
    drawer: "250ms",
    toast: "300ms",
    page: "350ms",
    charts: "700ms",
    numbers: "1000ms",
  },
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  }
} as const;

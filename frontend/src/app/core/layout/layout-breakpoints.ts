/**
 * Єдині breakpoint-и layout (мають збігатися з styles/_breakpoints.scss).
 * Нові magic @media (max-width: Npx) у компонентах заборонені — лише LAYOUT_BP / SCSS mixins.
 * Виняток: card-grid 840 / 1320 як іменовані константи ($grid-2col-min / $grid-3col-min).
 */
export const LAYOUT_BP = {
  handsetMax: 599.98,
  tabletMin: 600,
  tabletMax: 1023.98,
  desktopMin: 1024,
  compactSplitMax: 1099.98
} as const;

/** Media queries для BreakpointObserver (CDK). */
export const LAYOUT_QUERIES = {
  handset: `(max-width: ${LAYOUT_BP.handsetMax}px)`,
  tablet: `(min-width: ${LAYOUT_BP.tabletMin}px) and (max-width: ${LAYOUT_BP.tabletMax}px)`,
  desktop: `(min-width: ${LAYOUT_BP.desktopMin}px)`,
  compactSplit: `(max-width: ${LAYOUT_BP.compactSplitMax}px)`
} as const;

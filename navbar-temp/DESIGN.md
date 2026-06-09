---
name: Cinematic Intelligence
colors:
  surface: '#101412'
  surface-dim: '#101412'
  surface-bright: '#363a37'
  surface-container-lowest: '#0b0f0d'
  surface-container-low: '#181d1a'
  surface-container: '#1c211e'
  surface-container-high: '#272b28'
  surface-container-highest: '#313633'
  on-surface: '#e0e3de'
  on-surface-variant: '#bec9c1'
  inverse-surface: '#e0e3de'
  inverse-on-surface: '#2d312e'
  outline: '#89938c'
  outline-variant: '#3f4943'
  surface-tint: '#89d6ae'
  primary: '#89d6ae'
  on-primary: '#003824'
  primary-container: '#2f7d5b'
  on-primary-container: '#d1ffe3'
  inverse-primary: '#186b4b'
  secondary: '#e0c390'
  on-secondary: '#3f2e07'
  secondary-container: '#57441c'
  on-secondary-container: '#cdb180'
  tertiary: '#ffb3b2'
  on-tertiary: '#581c1f'
  tertiary-container: '#a7595a'
  on-tertiary-container: '#fff2f1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a4f3c9'
  primary-fixed-dim: '#89d6ae'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#fddfaa'
  secondary-fixed-dim: '#e0c390'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#57441c'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#ffb3b2'
  on-tertiary-fixed: '#3c060c'
  on-tertiary-fixed-variant: '#753133'
  background: '#101412'
  on-background: '#e0e3de'
  surface-variant: '#313633'
typography:
  display-lg:
    fontFamily: Bebas Neue
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.05em
  headline-lg:
    fontFamily: Bebas Neue
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.03em
  headline-md:
    fontFamily: Bebas Neue
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  headline-sm:
    fontFamily: Bebas Neue
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 16px
---

## Brand & Style

This design system is built for high-end SaaS environments where depth, precision, and a premium "command center" feel are paramount. The brand personality is authoritative yet sophisticated, utilizing a **Cinematic Glassmorphism** style to create a sense of focused immersion.

The visual language balances the density of technical data with the elegance of luxury editorial design. It relies on deep environmental layering, where the interface feels like a series of illuminated glass panes floating within a dark, expansive void. Key characteristics include:
- **Depth through Translucency:** Interfaces are built using stacked layers with backdrop blurs.
- **Micro-interactions:** Subtle glows and hairline borders that react to user presence.
- **High-Contrast Accents:** Strategic use of gold and emerald to guide focus against the midnight backdrop.

## Colors

The palette is anchored in **Midnight Forest Dark**, providing a non-distracting foundation that minimizes eye strain. 

- **Primary (Emerald Moss):** Used for actionable states, success indicators, and core brand moments. It represents growth and stability.
- **Accent (Champagne Gold):** Reserved for high-value calls to action, premium features, and critical highlights. It provides a warm contrast to the cool dark base.
- **Surface & Text (Soft Pearl):** This off-white prevents the harshness of pure white (#FFFFFF), ensuring readability remains high while maintaining a refined aesthetic.
- **Glass Infrastructure:** Semi-transparent fills (typically `rgba(10, 14, 12, 0.6)`) paired with the 1px Soft Pearl border create the glass effect.

## Typography

Typography establishes a clear hierarchy between high-impact branding and functional utility.

- **The Logo & Large Headers:** Utilize **Bebas Neue**. This condensed, uppercase sans-serif provides a cinematic, authoritative feel. It should be used for section titles and hero statements.
- **UI & Body Copy:** Utilize **Inter**. Chosen for its exceptional legibility in dark mode and its neutral, humanist character. 
- **Scale Strategy:** On mobile devices, `display-lg` should scale down to `headline-lg` (40px) to ensure no layout breaking. 
- **Formatting:** Use `label-sm` for secondary metadata and eyebrow text, always paired with generous letter spacing and uppercase styling to enhance the "technical" feel.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with fixed maximum constraints. This ensures that data density remains manageable on ultra-wide monitors while staying accessible on smaller devices.

- **Grid System:** A 12-column grid is used for desktop. Components should align to an 8px baseline rhythm.
- **Padding & Breathing Room:** Given the dark theme, whitespace (or "darkspace") is essential to prevent the UI from feeling claustrophobic. Use larger margins (`64px+`) between major sections.
- **Responsive Behavior:** 
    - **Desktop (1200px+):** Full 12-column with 64px side margins.
    - **Tablet (768px - 1199px):** 8-column grid with 32px margins.
    - **Mobile (Below 768px):** 4-column grid with 16px margins; navigation transitions to a full-screen glass overlay.

## Elevation & Depth

Depth is not communicated via traditional drop shadows, but through **Tonal Opacity** and **Backdrop Blurs**.

1.  **Level 0 (Background):** Pure #0A0E0C. The infinite base.
2.  **Level 1 (Sub-surfaces):** 4% Soft Pearl overlay on background. No blur. Used for sidebar containers or footer areas.
3.  **Level 2 (Standard Cards):** Background color at 60% opacity with a `20px` backdrop-blur and a `1px` border (12% Soft Pearl).
4.  **Level 3 (Modals/Popovers):** Background color at 80% opacity with a `40px` backdrop-blur and a `1px` border (20% Soft Pearl). This level uses a subtle outer glow of the Primary color (10% opacity) to signify focus.

Borders should use a linear gradient from top-left to bottom-right to simulate a light source catching the edge of the glass.

## Shapes

The shape language is **Rounded**, balancing the aggressive nature of the condensed typography with approachable, soft-touch corners.

- **Standard Radius:** 0.5rem (8px). Used for cards, input fields, and standard buttons.
- **Large Radius:** 1rem (16px). Used for major container sections and modals.
- **Interactive Elements:** Use the standard 8px radius. Avoid pill shapes for buttons to maintain a more professional, "architectural" SaaS aesthetic.

## Components

- **Buttons:** 
    - **Primary:** Solid Emerald Moss with Soft Pearl text. High contrast. On hover, add a subtle outer glow of the same color.
    - **Accent:** Solid Champagne Gold with Black text (#0A0E0C). Reserved for "Upgrade" or "Finalize" actions.
    - **Ghost:** 1px glass border with Soft Pearl text. Background fills 10% on hover.
- **Input Fields:** Semi-transparent dark fills. Focus state is signaled by the 1px border changing from 12% opacity to 100% Emerald Moss.
- **Chips/Badges:** Small, uppercase text. Backgrounds use 10% opacity of the category color (e.g., 10% Emerald for 'Active') with a solid 1px left-hand border.
- **Cards:** Must utilize the Level 2 elevation (glassmorphism). Header areas within cards should be separated by a subtle 1px horizontal rule.
- **Glass Nav:** A top-fixed navigation bar with 70% opacity and a heavy `32px` backdrop blur. This ensures content scrolling underneath remains legible but aesthetically diffused.
---
name: ProCommerce Hub
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: beVietnamPro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: beVietnamPro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: beVietnamPro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: beVietnamPro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: beVietnamPro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  numeral-lg:
    fontFamily: beVietnamPro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter-sm: 12px
  gutter-md: 20px
  margin-page: 24px
  sidebar-width: 280px
  card-padding: 16px
---

## Brand & Style

The design system is engineered for retail environments where speed, clarity, and reliability are paramount. It targets business owners and cashiers who require a high-density, functional interface that reduces cognitive load during fast-paced operations.

The visual style is **Corporate / Modern** with a strong emphasis on RTL (Right-to-Left) optimization for Arabic-speaking markets. It utilizes a structured, grid-based layout that feels organized and trustworthy. The interface balances high-density data tables with generous white space in dashboards to ensure critical financial metrics are immediately legible. Visual cues are used sparingly but effectively to indicate status, urgency, and actionability, creating an environment that feels both professional and efficient.

## Colors

The color palette is anchored by a high-visibility primary blue, chosen for its association with technology and trust. This is supported by a deep slate secondary color used for navigation and text to ensure high contrast and readability.

The background uses a soft, light gray to reduce eye strain over long shifts. Accent colors are strictly functional: emerald for growth and successful transactions, amber for low-stock warnings, and rose for errors or overdue payments. All color applications must pass WCAG AA contrast standards, particularly for data visualization and label text.

## Typography

The design system utilizes **beVietnamPro** for its exceptional legibility in both Latin and Arabic scripts. Its contemporary, clean glyphs remain sharp at small sizes, which is essential for dense data tables and receipts.

- **Headlines:** Used for page titles and section headers to establish a clear information hierarchy.
- **Body Text:** Optimized for long-form reading in reports and settings descriptions.
- **Labels:** Used for form field titles, button text, and navigation links.
- **Numerals:** Special attention is given to numerical data; price points and quantities use a bolder weight to stand out in the dashboard cards.
- **RTL Support:** Typography rules include specific line-height adjustments to accommodate Arabic diacritics without clipping.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop and tablet, ensuring that POS controls remain in predictable locations for muscle memory. 

- **Sidebar Navigation:** A persistent right-hand sidebar (for RTL) provides immediate access to core modules. It can be collapsed on smaller tablets to maximize the workspace.
- **Content Area:** Uses a 12-column grid system. Dashboards utilize 3 or 4 column spans for metric cards, while data tables typically span the full 12 columns.
- **Spacing Rhythm:** Based on a 4px baseline grid. Padding and margins scale in increments of 4 (4, 8, 12, 16, 24, 32, 48) to maintain a consistent visual rhythm.
- **Responsive Behavior:** 
  - **Desktop:** Full sidebar and multi-column layout.
  - **Tablet:** Sidebar collapses to icons; grid reflows to 2 columns for metrics.
  - **Mobile:** Single column layout; bottom navigation bar replaces the sidebar for essential quick actions.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and subtle shadows. 

The primary canvas uses the neutral background color (#F8FAFC). Interactive elements like cards and containers are elevated using a white surface with a very soft, diffused shadow (0px 1px 3px rgba(0,0,0,0.1)). This "card-on-canvas" approach clearly defines different functional areas without the visual clutter of heavy borders.

Active states, such as a selected navigation item or a focused input field, use a primary-colored glow or a subtle inset shadow to indicate presence. Modal overlays use a 40% opacity slate backdrop to pull focus to the foreground task.

## Shapes

The design system employs a **Rounded** shape language to soften the industrial nature of POS software. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Section containers and primary dashboards use a 1rem (16px) radius to create a distinct frame for content.
- **Pills:** Status indicators (badges) and filter chips use a full pill shape (999px) to distinguish them from actionable buttons.
- **Consistency:** All corners within a nested group must maintain concentricity; if a card has a 16px radius, the inner padding should be 16px to ensure a balanced aesthetic.

## Components

### Buttons
- **Primary:** Solid #2563EB with white text. High emphasis for "Finalize Sale" or "Save Changes."
- **Secondary:** White background with a light slate border. Used for "Cancel" or "Print Receipt."
- **Ghost:** No border or background. Used for secondary navigation within tables.

### Input Fields
- Use a light background (#F1F5F9) with a 1px border. On focus, the border transitions to Primary Blue with a 2px outer glow. Labels are always persistent above the field.

### Data Tables
- Header rows are styled with a light gray background and bold labels. 
- Rows use zebra-striping or a subtle bottom border for tracking across large screens. 
- The final column is reserved for contextual actions (Edit, Delete, View).

### Metric Cards
- Feature a large `numeral-lg` value, a `label-md` description, and an icon in the top-left (or top-right for RTL) corner. 
- Progress indicators (sparklines) are used within these cards to show 24-hour trends.

### Sidebar Navigation
- Icons are placed to the right of the text label.
- The active state is indicated by a vertical blue bar on the far right and a light blue background tint for the entire row.

### Status Chips
- Small, pill-shaped indicators. Color-coded based on the status (e.g., Green for "Paid," Red for "Overdue").
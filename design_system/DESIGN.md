# Design System Document: The Kinetic Utility

## 1. Overview & Creative North Star
**Creative North Star: "The Editorial Engineer"**

This design system moves away from the generic "SaaS dashboard" aesthetic and toward a high-end editorial experience. It balances the utilitarian precision of EV data with the sophisticated warmth of a premium lifestyle brand. We achieve this through "Organic Brutalism"—using bold, high-contrast typography and a rigid information architecture softened by a warm, creamy color palette and layered depth. 

The layout should feel intentional and asymmetric. Instead of a standard centered container, we utilize a split-view system: a light-themed "Input Laboratory" (left) and a high-contrast, dark-themed "Results Monolith" (right). This clear visual bisection instantly communicates the relationship between user input and cost output.

---

## 2. Colors
Our palette is rooted in high-contrast transitions. We utilize deep charcoals against warm custard tones to create an interface that feels both technical and inviting.

### Primary Tones
- **Primary (`#a13a17` / Spicy Paprika):** Used for primary actions and critical cost-saving highlights.
- **Secondary (`#5d5c73` / Ink Black variant):** Used for grounding the interface and providing structural weight.
- **Tertiary (`#745725` / Apricot Cream variant):** Reserved for moderate-priority data points and secondary highlights.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. Structural definition must be achieved through:
1.  **Background Shifts:** Use `surface-container-low` for secondary input areas against a `surface` background.
2.  **Tonal Transitions:** Define the edge of a section by transitioning from `Vanilla Custard` to `Alabaster Grey` backgrounds.

### Glass & Gradient Rule
For floating "Quick-Action" menus or tooltips, use Glassmorphism. Implement a 60% opacity on `surface-container-highest` with a `24px` backdrop blur. Main action buttons should feature a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle to add "soul" and depth.

---

## 3. Typography
The typography system relies on the interplay between the technical precision of **Space Grotesk** and the readability of **Inter**.

- **Display & Headlines (Space Grotesk):** These should be treated as editorial elements. Use `display-lg` for the primary "Cost Savings" figures. The wide apertures and geometric forms of Space Grotesk convey a modern, automotive feel.
- **Titles & Body (Inter):** Inter handles the heavy lifting of data labels and instructional text. Its neutral tone ensures that the information-heavy "Location" and "Rate Plan" sections remain legible and professional.
- **Hierarchy as Brand:** Large scale-contrasts (e.g., a `label-sm` immediately adjacent to a `display-md`) should be used to emphasize the "Cost Analysis" results, making the data feel authoritative.

---

## 4. Elevation & Depth
Depth in this system is not about "floating" objects; it is about **Tonal Layering**.

- **The Layering Principle:** To create a "card" effect, place a `surface-container-lowest` (#ffffff) element on top of a `surface-container` (#eceef0) background. This creates a soft, natural lift that mimics fine stationery.
- **Ambient Shadows:** Shadows are reserved only for transient elements (modals, dropdowns). Use a `12%` opacity of the `on-surface` color with a `48px` blur. It should feel like an ambient glow, not a hard shadow.
- **The "Ghost Border" Fallback:** For input fields where high-definition is required for accessibility, use the `outline-variant` token at **15% opacity**. This provides a "suggestion" of a boundary without cluttering the editorial clean lines.
- **Glassmorphism:** Use semi-transparent layers for the "Results Monolith" sidebar to allow the warm background tones to bleed through, softening the transition between the input and output zones.

---

## 5. Components

### Input Fields & Selectors
- **Style:** Forgo the boxy border. Use a `surface-container-highest` background with a `0.25rem` (DEFAULT) radius and a `label-md` floating above it. 
- **States:** On focus, transition the background to `primary-fixed` with a subtle `primary` ghost border (20% opacity).

### High-Contrast Data Visualization
- **Doughnut Charts:** Use `Spicy Paprika` and `Apricot Cream` for high-contrast segments. The center of the doughnut should always display the total cost in `headline-lg` Space Grotesk.
- **The Progress Slider:** For the "Current Charge" selector, use a thick track in `surface-variant` and a large, tactile thumb in `primary`.

### Buttons
- **Primary:** High-gloss gradient (Primary to Primary-Container). Use `xl` (0.75rem) roundedness for a modern, friendly feel.
- **Secondary:** `surface-container-high` background with `on-surface` text. No border.

### Cards (Information Blocks)
- **Rule:** Forbid divider lines. Use `md` (0.375rem) spacing between items and rely on the `surface-container` nesting to separate "Location" from "Rate Plan."

### Contextual Tooltips
- **Timing:** 200ms fade-in.
- **Style:** Ink Black (#050517) background with Vanilla Custard text. This provides a "dark mode" pop-over that feels premium and focused.

---

## 6. Do's and Don'ts

### Do:
- **Do** use intentional asymmetry. A slightly wider margin on the left than the right can make a layout feel designed rather than generated.
- **Do** use large, bold typography for currency values. The "Cost Analysis" should be the most visually "loud" part of the screen.
- **Do** use `surface-container` tiers to create a visual hierarchy of inputs.

### Don't:
- **Don't** use 1px solid black or grey borders. They kill the editorial "high-end" feel.
- **Don't** use standard blue for links. Use `primary` (Spicy Paprika) for all interactive accents.
- **Don't** crowd the data. If a section feels heavy, increase the vertical white space using the `xl` spacing scale rather than adding lines.
- **Don't** use pure grey shadows. Always tint shadows with a hint of the brand’s `secondary` or `on-surface` color to maintain warmth.
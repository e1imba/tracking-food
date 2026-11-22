---
name: styling
description: Apply Tracking Food's agreed mobile-first visual and interaction style to pages and forms.
---

# Tracking Food styling

Read AGENTS.md, the current ticket and canonical specifications first. This skill
records issue #13's confirmed style; future confirmed requirements take precedence.
Use existing tokens and concrete components in `src/app/globals.css` and
`src/components/ui/dialog.tsx`. Do not introduce a generic design-system project.

- Canvas #F6F7F9, white surfaces, ink #17212B, emerald #087F6B. Use muted text
  with readable contrast. Keep the same system sans-serif typography across pages.
- Spacing: 4/8/12/16/24/32 px; radius 12–16 px. Subtle borders; reserve prominent
  shadows for floating controls and panels. Keep overview content compact and useful.
- Start at 360 px. At >=1024 px use the 240 px sidebar. Smaller screens use the
  compact header and left navigation drawer. Only implemented destinations appear.
  Account and logout live at the bottom of navigation. Mark the current destination.
- Meal overview: desktop table; mobile rows grouped by device-local date. Wrap long
  words, expand long content with a keyboard-accessible control, never hide data
  permanently or require horizontal scrolling. Preserve space below the last row.
- One meal action: bottom-center island on mobile, bottom-right on desktop. Display
  plus and fork/knife SVG, aria-hidden icons, aria-label and hover/focus tooltip
  “Dodaj obrok”. Respect safe-area insets. Do not add speculative tab destinations.
- Use the Radix-backed shadcn-style dialog primitive for modal panels/drawers:
  accessible title/description, trapped/restored focus, Escape, inert background.
  Meal and symptom forms fill the visible viewport on phones in either orientation,
  with close and save in the compact header and initial focus on the title.
  Existing meal and food suggestions appear below their fields in the scrolling
  meal form. On larger screens, both forms use a modal up to 560 px with save in
  the footer and initial focus on the name field. Scroll the body and keep the
  focused control and submit inside the visible viewport.
- Label every field. Targets >=44 px, visible focus, 16 px input text. Search the
  catalog, show removable selections and allow new foods without a long checkbox
  list. Errors retain input; successful saves close the panel and announce success.
  Confirm before discarding entered data. Initialize time each time input opens.
- Verify 360/390/768/1440 px, long synthetic text, empty states, keyboard focus,
  Escape, scroll, software keyboard and safe area. Capture desktop/mobile evidence;
  distinguish browser emulation from a physical-device check in the PR.

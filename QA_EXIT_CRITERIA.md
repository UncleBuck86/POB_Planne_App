# Exit Criteria (Release Validation)

Use this checklist before marking a release as done.

## Routes load cleanly
- Dashboard: `#dashboard`
- Planner: `#planner`
- Personnel: `#personnel`
- Logistics: `#logistics`
- Flight Manifest Template: `#logistics/manifest`
- POB: `#pob`
- Admin (if enabled): `#admin`

Verify for each:
- Page renders without blank screen.
- No visible error banners.
- Console has no errors (open DevTools > Console).

## Deltas & totals correct
- Planner daily “Total Daily POB” matches sum of visible rows (or all when “Include hidden rows in totals” is enabled).
- Dashboard forecast totals and Flights Out (+)/In (-) rows match planner deltas for the next 7 days.
- Flight Manifest weights and pax totals reflect the current passenger lists per direction.

## Persistence works
- Planner table edits persist after refresh (local storage keys like `pobPlannerData`).
- Planner comments persist (key `pobPlannerComments`).
- Settings toggles (e.g., include hidden in totals, toast preference) persist.
- Admin mode preference persists (if toggled).

## No unhandled errors
- With DevTools open, interact across routes (edit cells, toggle settings, open modals) and verify:
  - No red errors in Console.
  - No “Unhandled Promise Rejection” messages.

Notes:
- Data is stored locally in the browser and may include PII.
- Exports default to redacted; opt-in is required for including comments.

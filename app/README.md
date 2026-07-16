# Shift Log — Modular Build

This is a behavior-preserving refactor of the original monolithic `hm__30_.html`
(3,884 lines, one `<style>` block + one `<script>` block) into a modular
CSS/JS project. **Zero logic was rewritten** — every rule and every statement
was extracted verbatim from the original file, not retyped, and the result
was diffed byte-for-byte against the source to guarantee no drift.

## Structure

```
index.html                       ← DOCTYPE/head/body markup (unchanged), links CSS + loads JS
assets/css/
  core.css                       ← CSS reset, tokens, base typography, .btn/.field/.msg, reduced-motion
  auth.css                       ← Login screen (.auth-wrap)
  ui.css                         ← Reusable shell/components: dash header, tabs, panels,
                                    category picker, date-display widget, modal
  dashboard.css                  ← Stat cards
  customer.css                   ← Customer/employee list tables (.cust-table, .emp-row family)
  employee.css                   ← Mini clock / timer / punch button / time-log rows
  invoice.css                    ← Invoice generator, package picker, print media query
  accounts.css                   ← Sub-tabs, inline clear-payment form, ledger expand row
assets/js/
  core/            supabase-client.js, logo.js, datetime.js, screens.js, init.js
  auth/            login.js
  dashboard/       admin-stats.js, accounts-summary-card.js
  employee/        admin-employee-management.js, employee-timer.js
  services/        admin-services-management.js, packages.js
  customer/        customer-registration.js, patient-id-autosuggest.js, patient-search.js
  invoice/         service-selection.js, tests-packages-toggle.js, package-selector.js,
                    payment-type.js, calculation.js, save-invoice-history.js,
                    save-to-ledger.js, print-save-validate.js
  accounts/        live-balances.js, employee-daily-closing.js, admin-overview.js,
                    admin-full-ledger.js, add-amount.js, add-expense.js, csv-export.js,
                    expenses.js, closing-check.js, pending-payments.js,
                    transactions-history.js
  ui/              modal-helpers.js, confirm-modal.js, accounts-subtabs.js, tabs.js, view-mode.js
```

## Why this split preserves 100% of behavior

**HTML**: The DOM structure (all screens, tabs, panels, forms, tables, modals)
is kept in a single `index.html` body, byte-identical to the original markup.
Splitting HTML into fetch()-based partials was intentionally avoided — that
would introduce asynchronous loading and change the timing the original
inline `<script>` relied on (it assumes every element already exists in the
DOM the instant it runs). Keeping one HTML file guarantees the DOM is 100%
ready before any script executes, exactly like the original.

**CSS**: Every rule was audited for selector collisions across the new files
— there are none (each class name is unique to one section), so `<link>`
load order cannot change any computed style. Verified programmatically.

**JavaScript — this is the critical one**: The original app is a set of
classic (non-module) `<script>` blocks. In a classic script, top-level
`let`/`const`/`function` declarations are added to the *same* global lexical
environment shared by every `<script>` tag on the page — so splitting one
`<script>` into many `<script src>` tags has **no effect on scoping**, as
long as they run in the same order. Because many sections aren't just
function declarations but *run immediately* (`addEventListener` calls,
`wireDateDisplay(...)`, computed globals like `sb`), execution order matters.
So the 39 JS files are loaded in `index.html` in **exactly the same
top-to-bottom order** as the statements appeared in the original file — the
concatenation of all 39 files, in their `<script src>` order, is byte-for-byte
identical to the original inline script (verified with `diff`). Folder
placement (core/auth/dashboard/...) is purely organizational; it does not
affect load order.

## Verification performed

- `node --check` passed on all 39 individual JS files and on the full
  concatenation.
- `diff` between the original inline `<script>` body and the 39 files
  concatenated in their load order: **identical, zero differences**.
- CSS selectors checked for cross-file collisions: **none found**.
- All `<script src>` / `<link>` paths in `index.html` verified to resolve to
  real files on disk.

## Running it

Any static file server works (the app talks directly to Supabase from the
browser, so no backend is needed):

```
npx serve .
# or
python3 -m http.server
```

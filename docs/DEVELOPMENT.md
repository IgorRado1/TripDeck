# TripDeck — Travel Solitaire

Slovenian, local-first travel planning as a tactile card game. Source, configuration, tests, example data, and build output live directly in **`C:\Users\Uporabnik\Desktop\TripDeck`**. No nested project directory or API keys.

## Launch on Windows

Requires Node.js **22.12+** (Node 24 recommended) and npm.

```powershell
cd "C:\Users\Uporabnik\Desktop\TripDeck"
npm.cmd install
npm.cmd run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173. If the port is occupied Vite prints another port. Use the same origin consistently: browser storage is isolated by hostname and port.

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd test
```

Production output is in `dist/`. Static hosting is sufficient. The implementation uses React, strict TypeScript and Vite because this application runs entirely in the browser and needs no server rendering. dnd-kit handles dragging; Papa Parse and Zod handle imports; Dexie handles IndexedDB; Temporal handles IANA time zones and daylight saving. Styling and illustrations are local CSS; optional Google Fonts fall back to system fonts if offline. No hosting or cloud account was created.

## Play

1. Start with the **Japonska v cvetju** demo (18 illustrative activities, March 25–April 14, 2027) or select the trip name to create a new trip. Previous trips remain independently saved in **Moja potovanja**.
2. **Uvozi aktivnosti iz CSV** opens an upload, mapping, validation and preview wizard. Both drag-file upload and file selection work. Fix every error before confirming; failed imports preserve existing work.
3. Only the top card is active. Drag its upper-right grip onto a broad time region, tap a region, or use **Predlagaj najboljši termin**. Review the exact date, start and duration, then confirm. No action books an activity.
4. **Pokaži možne termine** highlights compatible regions. Green means the imported schedule fits; amber means availability is unknown. Cancelled activities cannot be scheduled. Suggestions prefer the destination's segment and reasonable daytime starts.
5. **Za pozneje** puts the active card onto the shortest of eight UNDECIDED stacks. Drag onto an occupied stack to append a card on top; there is no capacity limit. Each stack is ordered bottom to top, and only its top card can be dragged, scheduled, or returned to the main deck. Inspect a stack using its heading without changing order. Skipped cards remain recoverable. The collection offers search, city/category/priority/status filters, compatible-day filtering, favorites, edits, duplication and explicit recurring instances.
6. Navigate to any valid calendar date with the arrows or date picker. Single-day navigation steps one day; multi-day navigation retains its three-day step. Trip dates are reference dates, not navigation or placement limits. Outside dates show **Izven načrtovanega potovanja**; valid manual placements show a non-blocking warning and require normal confirmation. Activity date, time, overlap and travel-buffer checks still apply. **Nazaj na začetek potovanja** returns to the reference start. The selected board date is remembered per trip. Click a day’s location label to assign a destination; outside days default to **Lokacija ni določena.** and retain manual assignments even when the trip dates change. Overview, print, CSV and ICS include outside-trip placements. Automatic best-slot suggestions still use the intended travel period; manual placement and visible-day hints work outside it.

   Move placed cards with their grip or edit icon. Exact times and per-placement duration are editable. Return them to the top or holding area from the placement dialog. Overlaps and inadequate travel buffers require an explicit override and remain visibly marked.
7. Undo/redo restores the itinerary and card piles together (up to 100 moves). Keyboard: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z outside text inputs. History survives reloads.
8. Enable **Družinski način** for local named votes. Edit travelers and destination segments in trip settings. No votes synchronize across devices.
9. Export JSON for full backup, CSV for spreadsheets, ICS for calendars, or print/save PDF. JSON restore validates the entire state, preserves imported history, and leaves other saved trips available.

All activity availability in the demo and CSV example is **illustrative and unverified**. Booking status is independent of schedule compatibility.

## CSV format

Example: [`public/example-activities.csv`](../public/example-activities.csv). The importer also provides a download button. Required headers are `title` and `availability` (Slovenian aliases and manual mapping are supported).

Optional: `id`, `description`, `category`, `city`, `location`, `start_time`, `end_time`, `time_windows`, `duration_minutes`, `priority`, `booking_status`, `booking_url`, `notes`, `price`, `currency`, `exceptions`.

- UTF-8 with/without BOM; comma and semicolon delimiters; quoted commas and newlines.
- Availability: `any day`, `anytime`, `kadarkoli`, `vsak dan`, `every Monday, Wednesday, Friday`, Slovenian weekday expressions, `weekdays`, `weekends`, `med tednom`, `ob vikendih`, `2027-04-11`, `2027-04-11|2027-04-12`, `2027-04-01..2027-04-07`, `unknown`, `neznano`.
- Quote availability containing commas in comma-delimited files.
- Times are `HH:mm`. Multiple windows: `09:00-12:00|14:00-18:00`. `23:00-02:00` means an overnight window on the activity's start date. Equal start/end represents a 24-hour window.
- `exceptions`: ISO dates separated by `|`.
- `priority`: `high`, `medium` (default), `low`.
- `booking_status`: `unconfirmed` (default), `confirmed`, `pending`, `booked`, `cancelled`.
- Defaults: 90 minutes, 06:00–23:59, Other category, EUR, zero/unspecified price.
- Stable `id` is recommended. Otherwise identity derives from title, city and availability. Duplicate policy: skip, update, or create new. Updates retain placements, votes and favorites; new conflicts remain visible.
- Maximum file size: 10 MB. Reference trip ranges: up to 3,660 days; this does not limit board navigation or manual placement dates.

## State and time model

`Activity` is canonical metadata; `deck` is a separate ordered list of remaining IDs, with `undecided.piles` containing exactly eight bottom-to-top arrays, distinct skipped IDs, and placement instances. Each pile has unlimited capacity. The existing sidebar uses two columns by four rows so cards stay readable. The renderer paints at most six overlapping layers at 10 px offsets, capping spread at 50 px while counters and persisted arrays retain every card. Recurring instances require explicit user action. Deck order is deterministic for a given seed, with chronological, destination shuffle, fully shuffled and priority modes. Flexible activities are distributed through their destination segment rather than all assigned to day one.

IndexedDB database `TripDeck`, schema version 2, stores each trip's complete history and the active session. Writes are serialized and errors are shown in the UI. Version 2 migrates every legacy flat `held` array in all stored trips and their undo/redo snapshots, distributing cards round-robin across eight piles without dropping any. Legacy JSON backups are migrated through the same validated conversion. Existing trips without manual day locations default to an empty location map when loaded. Small display preferences and the selected board date per trip use localStorage. Clearing browser/site data removes the local database: export JSON periodically. JSON is a backup of the **selected trip**, not every saved trip.

Dates on the board are civil dates in the trip's IANA time zone. Placement durations and overlaps use actual elapsed minutes. New placements also retain UTC `startAt` / `endAt` snapshots; date/time plus trip time zone remain authoritative when settings change. Nonexistent DST times are rejected; ambiguous autumn times use the earlier occurrence with an explicit warning. ICS exports UTC instants and stable UIDs, avoiding dependence on a recipient's local time-zone database. Overnight instances appear on each affected day without duplicating bookings.

## Browser tests

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Alternatively use installed Microsoft Edge:

```powershell
$env:TRIPDECK_TEST_CHANNEL = "msedge"
npm.cmd run test:e2e
```

To reuse a server running on a different port, set `$env:TRIPDECK_TEST_URL = "http://127.0.0.1:5174"`. Tests use isolated browser profiles, preserving personal browser data. Unit coverage includes recurrence, windows, exact minutes, overlaps, travel buffers, unknown schedules, overnight intervals, DST, deterministic deck generation, CSV parsing, backup validation and undo/redo. Browser coverage includes creation, 40-row import, drag/drop, invalid placement, editing, reload persistence, export, mobile tap placement, 95-card legacy migration, 60-card stacks, occupied-pile drops, pile-to-pile moves, pile-to-board scheduling, board-to-pile returns, top-card reveal, exact undo/redo, responsive stack inspection, unrestricted date navigation across months/years, outside-trip scheduling warnings, outside-trip exports, per-day destinations and selected-date persistence.

## Project structure

```text
src/
  main.tsx          React entry point
  App.tsx           Application and reusable card, slot, dialog, holding components
  styles.css        Responsive tabletop, card artwork, motion and print styles
  model.ts          Domain types
  engine.ts         Availability, validation, suggestions, deck generation, history
  board.ts          Free date navigation, day locations and sparse itinerary dates
  piles.ts          Atomic card moves, eight-pile state and legacy migration
  UndecidedPiles.tsx Overlapping stack display and top-card interaction
  zoned.ts          IANA time-zone / DST conversion
  importer.ts       CSV parsing, mapping, validation and example
  storage.ts        IndexedDB, serialized saves, backup validation
  export.ts         CSV, JSON download support and UTC iCalendar
  demo.ts           Demonstration trip
  *.test.ts         Domain tests
tests/              Playwright end-to-end tests
public/             Downloadable example CSV
```

## Current limits / unfinished enhancements

- No cloud sync, accounts, real-time multiplayer, live availability checks or automatic bookings. Family mode is local cooperative voting.
- One time-window set per activity; weekday-specific windows require separate activity definitions. Exceptions are closed dates rather than per-date replacement hours.
- An activity with multiple explicitly scheduled recurring instances cannot also be moved into a pile or deck while its other instances remain scheduled; duplicate its definition to plan an independent card.

- The top card can reveal all compatible slots and suggest a best slot; there is no separate next/previous suggestion carousel.
- No separate day/destination completion badges, sound/haptic effects, adjustable visible hour range, resizable panels or English UI. The board uses six broad regions, with exact-minute placement available in dialogs (including before 06:00).
- CSS illustrations are intentionally stylized; custom uploaded activity photos are not supported.
- Large collections are searchable; the library and trip overview are not virtualized. The 500-card / 30-day performance target has not been benchmarked.
- Accessibility includes focus-trapped dialogs, visible focus, keyboard/tap alternatives, status announcements and reduced motion, but has not received an independent WCAG audit.

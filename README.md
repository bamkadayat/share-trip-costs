# Share trip costs

A small, fast web app for splitting the cost of a shared trip — a cabin
weekend, a group holiday, a road trip — evenly between everyone who came
along. Add each person or family, log who paid for what, and the app works
out the simplest set of payments that settles everyone up.

Everything runs in your browser. There's no account, no backend, and no data
leaves your machine — the trip is saved to `localStorage` so it's still there
when you come back.

## What it does

- **Participants as people *or* families.** A unit on the trip can be a single
  person or a whole family. Each unit counts as one equal share of the total,
  so a family of four splitting a cabin pays the same as a solo traveler.
- **Log expenses against whoever paid.** Record each expense (amount +
  description) under the participant who footed the bill.
- **Automatic settlement.** The app totals everything, computes each unit's
  equal share, and shows each one's balance — how much they paid, what they
  owe, and whether they come out ahead or behind.
- **Minimal payments.** Instead of everyone paying everyone, a greedy
  settlement produces the fewest transfers needed to square up: "Anna pays Per
  450 kr," and so on.
- **Exact, no rounding drift.** All math is done in integer øre, so shares
  always sum back to the exact total and the suggested transfers reconcile
  to the last øre. Amounts are formatted in Norwegian kroner (`nb-NO`).
- **Persistent & private.** State lives in `localStorage` under
  `cabin-split.trip`. Reset wipes everything (behind a confirm dialog).

## How the split works

1. Sum every expense → **total**.
2. Divide by the number of participants → each unit's **equal share**
   (the remainder is spread one øre at a time so the shares add up exactly).
3. For each unit, **net = paid − share**. Positive means they're owed money;
   negative means they owe.
4. Greedily match the biggest debtor to the biggest creditor until everyone
   is at zero, emitting one transfer per match.

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) for dev server and build
- [Vitest](https://vitest.dev) for unit tests (settlement logic)
- No runtime dependencies beyond React; persistence via `localStorage`

## Getting started

Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
pnpm install      # install dependencies
pnpm dev          # start the dev server (http://localhost:5173)
```

### Other scripts

```bash
pnpm build        # type-check and build for production (dist/)
pnpm preview      # preview the production build locally
pnpm test         # run the test suite once
pnpm test:watch   # run tests in watch mode
pnpm lint         # lint the project
```

## Project structure

```
src/
  components/
    ParticipantsPanel.tsx   # add/remove participants and their expenses
    ResultsPanel.tsx        # balances + suggested transfers
    ConfirmDialog.tsx       # reusable confirm modal (used by Reset)
  lib/
    settle.ts               # settlement math (øre-exact) + NOK formatting
    settle.test.ts          # unit tests for the settlement logic
    storage.ts              # load/save trip to localStorage
    useTrip.ts              # trip state hook (participants, expenses, reset)
  types.ts                  # domain model (Participant, Expense, Trip)
  App.tsx                   # layout: participants ⇄ results
```

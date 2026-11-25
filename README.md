# FRESH MART v2.0

A complete 3D supermarket simulator built with **Three.js + Vite**. All geometry, textures, characters and sound effects are generated procedurally — no external art or audio assets.

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Sprint |
| Mouse | Look around |
| E | Interact (pick up box, stock shelf, checkout, terminal, dumpster) |
| Esc | Pause / settings |

## Gameplay loop

1. Pick up delivery boxes outside (glowing beacon marks new deliveries).
2. Carry a box to a shelf with the matching product and press **E** to restock.
3. Empty boxes become flattened trash — carry them to the dumpster for a recycling bonus.
4. Customers take items and queue at the register. Press **E** at the register to check out:
   - **Card:** enter the exact total.
   - **Cash:** click bill/coin denominations to give exact change.
5. Use the **Store Terminal** to order stock, buy licenses, build shelves/fridges, expand the store, hire staff and rename the store sign.
6. The day runs 8:00 AM → 9:00 PM. At closing, review the daily report and start the next day with fresh prices and deliveries.

Progress auto-saves to `localStorage`; use the pause menu to save manually, adjust mouse sensitivity or reset progress.

## Project structure

```text
src/
  main.js                 bootstrap
  style.css               HUD + overlays
  core/                   Game loop, input, audio, save system
  world/                  Store world, lighting, shelf factory
  entities/               Player, customer AI/model, staff
  systems/                Interaction, delivery, checkout, economy
  ui/                     HUD/terminal/pause/checkout/summary UI
  data/                   Products, licenses, layout constants
  utils/                  Math, canvas textures, mesh helpers
```

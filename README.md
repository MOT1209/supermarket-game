# FRESH MART v2.0

A complete 3D supermarket simulator built with **Three.js + Vite**. The original procedural geometry/textures remain as fallbacks; Blender-exported GLB models in `public/models/` enhance the store, props, characters and products. Sound effects are generated procedurally — no external audio assets.

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

Production build and tests:

```bash
npm run build
npm run preview
npm test          # zero-dependency smoke tests (node --test)
```

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Sprint |
| Mouse | Look around |
| E | Interact (pick up box, stock shelf, checkout, terminal, dumpster) |
| Q | Drop the box you are carrying |
| Esc | Pause / settings |

## Gameplay loop

1. Pick up delivery boxes outside (glowing beacon marks new deliveries).
2. Carry a box to a shelf with the matching product and press **E** to restock.
3. Empty boxes become flattened trash — carry them to the dumpster for a recycling bonus.
4. Customers take items and queue at the register. Press **E** at the register to check out:
   - **Card:** enter the exact total.
   - **Cash:** click bill/coin denominations to give exact change.
   - A hired **cashier** checks out customers automatically.
5. Use the **Store Terminal** to:
   - **📦 Order Stock** — buy wholesale boxes (prices fluctuate daily).
   - **💲 Pricing** — set each product's shelf price (±$0.10, reset). You cannot sell below the current wholesale cost; the margin and margin % are shown.
   - **📜 Licenses** — unlock new product lines.
   - **🔨 Build / Furniture** — shelves ($150), refrigerators ($280), store expansion (+4 spots).
   - **👥 Staff** — hire a restocker and/or cashier (wages charged daily).
   - **🎨 Customize** — rename the 3D store sign.
6. The day runs 8:00 AM → 9:00 PM. At closing, review the daily report (revenue, stock costs, wages, rent & utilities, recycling, objective bonus) and start the next day with fresh prices and deliveries.

## Systems

- **Reputation (⭐ 0–5)** — happy customers raise it, angry ones (empty shelves, long queues, wrong change) lower it. It scales how often new customers arrive (0 → 0.5×, 5 → 1.5×) and is shown in the top HUD.
- **Daily objective (🎯)** — one rotating goal per day (serve N happy customers / earn $N / recycle N boxes). Completing it pays a bonus at closing; progress is shown in the terminal's Pricing tab and the daily report.
- **Customer preferences & patience** — each shopper has a favourite aisle (buying from it makes them happier) and a limited patience in the checkout queue before they leave angry.
- **Operating costs** — rent ($80/day) plus utilities per refrigerator ($6/day) are deducted at closing.
- **Dynamic pricing** — wholesale prices move daily; your shelf price is independent and clamped between cost and 4× the default markup.
- **Settings** — pause menu offers mouse sensitivity, master **volume** and **graphics** (low/medium/high: shadows + pixel ratio).

Progress auto-saves to `localStorage` (save schema v3, older saves migrate automatically); use the pause menu to save manually or reset progress.

## 3D assets (Blender → GLB)

`public/models/` contains 23 low-poly GLB models authored in Blender 5.2 and exported with glTF 2.0: the store shell, display stands, checkout counter, player, cashier, three shoppers, car, street kit, house and one model per product. `src/utils/AssetLoader.js` loads and caches them through `GLTFLoader`; `StoreWorld` decorates the scene and swaps the register visual, while `ShelfFactory` replaces shelf products once the GLBs are ready. If a model is missing, the original procedural mesh is kept, so the game still runs.

## Project structure

```text
src/
  main.js                 bootstrap
  style.css               HUD + overlays
  core/                   Game loop, input, audio, save system
  world/                  Store world, lighting, shelf factory (shared asset cache)
  entities/               Player, customer AI/model, staff
  systems/                Interaction, delivery, checkout, economy,
                          pricing, reputation, objectives
  ui/                     HUD/terminal/pause/checkout/summary UI
  data/                   Products, licenses, layout constants, tuning
  utils/                  Math, canvas textures, mesh helpers, GLB loader
public/
  models/                 23 Blender-exported GLB models (store, props, people, products)
tests/
  smoke.test.js           data/economy/objective + GLB export sanity checks (node:test)
```

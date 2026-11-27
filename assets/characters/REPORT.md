# FRESH MART — 12 Customer Characters: Final Report

## Characters Created (12)

Male:

1. customer_male_boy — Young boy (~8 yrs)
2. customer_male_teen — Teenager (~15 yrs)
3. customer_male_young — Young man (~22 yrs)
4. customer_male_adult — Adult man (~35 yrs)
5. customer_male_middle_aged — Middle-aged man (~50 yrs)
6. customer_male_senior — Senior man (~70 yrs)

Female: 7. customer_female_girl — Young girl (~8 yrs) 8. customer_female_teen — Teenager (~15 yrs) 9. customer_female_young — Young woman (~22 yrs) 10. customer_female_adult — Adult woman (~35 yrs) 11. customer_female_middle_aged — Middle-aged woman (~50 yrs) 12. customer_female_senior — Senior woman (~70 yrs)

Each has a unique face-less stylized humanoid mesh, distinct body proportions per age, unique clothing colors, hair styles (short/long/bald), and accessories (caps, glasses).

## Blender Source File

- assets/characters/blender/FRESH_MART_CUSTOMERS.blend (combined preview scene, 12 armatures, 224 meshes)
- Per-character single files: assets/characters/blender/customer_*.blend

## GLB File Locations

- public/models/customers/customer_male_boy.glb (and 11 others)
- assets/characters/customers/customer_*.glb (copies)

## Animation Clips (10 per character)

Idle, Walk, Turn, Shopping, PushCart, CarryBasket, PickItem, Checkout, Wait, React

## Game Integration Files Changed

- src/utils/AssetLoader.js — attach gltf.animations to loaded scene userData
- src/entities/Customer.js — load GLB characters via cloneModel, AnimationMixer + AnimationAction, state-driven animation selection, cleanup of mixers
- src/entities/CustomerModel.js — left in place for CityLife background pedestrians

## Tests Performed

- Blender: all 12 characters built, rigged with humanoid armature, 10 animations created and pushed to NLA.
- GLB export: all 12 exported with meshes, armature, materials, animations; verified clip names via Blender import.
- Game build: `npm run build` passes (built in ~8s).
- Runtime (Playwright): game starts, customers spawn, 10 actions load per customer, no console errors; pointer-lock warnings are headless-only and pre-existing.

## Notes

- Animation tracks use original cached clips (clone(true) loses KeyframeTrack prototypes); handled by loading original alongside clone.
- CityLife background pedestrians remain procedural (unchanged) to avoid regression.

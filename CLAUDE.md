# THE ENDLESS CASTLE

Dark fantasy first-person RPG — King's Field / Metroidvania style.

## Running

Serve the project root over HTTP (ES modules require a server):

```bash
npx serve . -l 3000
# then open http://localhost:3000
```

No build step, no npm install needed. Three.js is loaded from CDN.

## Architecture

```
index.html              # Entry, UI overlay, title screen
src/
  main.js               # Scene setup, game loop
  systems/
    PlayerController.js # WASD+mouse, attack, magic, inventory, interact
    UIManager.js        # HP/stamina/magic bars, messages, minimap hooks
    AudioSystem.js      # Procedural Web Audio (no external files)
    SaveSystem.js       # localStorage JSON save
  world/
    DungeonManager.js   # Room builder, walls, doors, torches, pickups, NPCs
    UndergroundLevel.js # Underground dungeon (Phase 2 area)
    MapSystem.js        # 2D minimap (M key)
  entities/
    EnemyManager.js     # Ghost knight, cursed soldier, giant spider FSM
    BossEnemy.js        # Two-phase boss — Ancient Knight Guardian
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move |
| Mouse | Look |
| Left click | Attack |
| Shift + move | Run (drains stamina) |
| E | Interact (doors / items / NPCs) |
| Space | Cast magic (fire bolt) |
| I | Inventory |
| M | Minimap |

## Development Phases

- **Phase 1 ✅** — First-person movement, entrance rooms, 3 enemy types, weapon, inventory, NPC
- **Phase 2 ✅** — Underground level, locked door / key, minimap, two-phase boss
- **Phase 3** — Upper castle (towers, chapel, throne room), additional spells, more NPCs, save points

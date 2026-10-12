# New Tech's

Extra progression mod for **Mindustry** (research, install upgrades, shop, missions, blueprints, bullet upgrades).

- **Author:** Gubby  
- **Version:** see `mod.hjson`  
- **Type:** JavaScript mod (`scripts/main.js`)  
- **Platforms:** Desktop + Mobile  

## Install

1. Download the release `.jar` / `.zip`
2. Put it in your Mindustry `mods` folder
3. Restart the game

## Source layout

```
mod.hjson                 # mod metadata
icon.png                  # mod icon
README.md
bundles/
  bundle.properties       # (optional extra strings)
scripts/
  main.js                 # full mod logic
sprites/
  effects/                # drill / factory overlays
  ui/                     # UI icons
```

## Build / pack

No compile step. Pack as zip/jar:

```bash
zip -r NewTechs.jar mod.hjson icon.png bundles scripts sprites
```

Mindustry loads `mod.hjson` + `scripts/main.js` from the archive.

## Notes

- Campaign: only shows blocks/units already unlocked in the vanilla tech tree
- Planet filter: Serpulo / Erekir (Sun = all)
- Sandbox (`infiniteResources`): research & install are free
- Multiplayer: shop/purchases sync with host rules

## License

Ask the author (Gubby) before redistributing as your own mod.

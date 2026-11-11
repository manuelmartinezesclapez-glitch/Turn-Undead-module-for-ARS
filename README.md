# ARS Turn Undead

A **Turn Undead** automation module for **ARS (Advanced Roleplaying System)** in Foundry Virtual Tabletop.

Designed for ARS v2, it integrates with the native ARS action workflow without replacing its core mechanics.

## Features

- **Native Integration:** Uses the standard Cast Shape → Action/Macro workflow.
- **Turn Undead Table:** Supports Turned (T), Destroyed (D) and Destroyed + 2d4 additional Turned (D*).
- **Target Limits:** Maximum 2d6 affected creatures.
- **Area:** 120 ft circular effect.
- **Target Filtering:** Excludes the caster, non-undead, dead, already Turned and unreachable creatures.
- **Line of Sight:** Walls and closed doors block the effect.
- **Clerics & Priests:** Use their full class level.
- **Paladins:** Apply the ARS effective priest level penalty of 2 levels.
- **Multiple Classes:** Uses the highest eligible effective level.
- **Manual Level:** Allows the DM to enter a turning level when no eligible class is detected.
- **Turned Effect:** Dedicated Active Effect lasting 10 rounds (1 turn).
- **Destroyed Effect:** Applies a Destroyed effect and sets HP to 0 when identifiable.
- **GM Support:** Allows effect application to actors not owned by the current user through an active GM.
- **Creature Identification:** Respects ARS player identification settings.
- **Target Review:** Allows the DM to correct automatically detected undead categories.

## Installation

### Manifest Installation

Use this URL in Foundry's **Add-on Modules → Install Module** window:

[Manifest URL](https://raw.githubusercontent.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/refs/heads/main/ars-turn-undead/module.json)

Paste the URL, click Install and enable the module in your world.

### Download

[Download the latest release](https://github.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/releases/latest)

Manifest installation is recommended for future updates.

## Compatibility

- Foundry VTT v14.
- ARS v2.
- Minimum ARS version: `2026.11.09`.

OSRIC and ARS v1 are untested and unsupported.

## Known Limitations

Undead category detection uses actor Hit Dice and exact standard category names (e.g. `Zombie`). Unusual or missing Hit Dice data may require manual correction through the DM confirmation dialog.

Applying effects to actors not owned by the current user requires an active GM.

## Version History

### v1.3.1

- Improved undead category detection, including fractional Hit Dice.
- Added exact-name recognition for standard undead categories.
- Improved circular Region target selection and area intersection checks.
- Added wall and closed-door line-of-sight checks.
- Prevented duplicate action execution.
- Improved ARS action popout handling.
- Improved world-item maintenance and

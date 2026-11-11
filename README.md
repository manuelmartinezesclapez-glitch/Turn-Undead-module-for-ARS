# ARS Turn Undead

A custom **Turn Undead** module for the **ARS (Advanced Roleplaying System)** in Foundry Virtual Tabletop.

The module integrates with the native ARS action workflow to automate undead turning without replacing or overriding the system's core targeting and action mechanics.

## 🚀 Features

### Native ARS Integration

- Integrates directly with the standard **Cast Shape → Action/Macro** workflow.
- Preserves the native ARS action flow instead of replacing core system functionality.
- Designed specifically for **ARS v2**.
- Maintains and updates the Turn Undead world item when required.

### Turn Undead Automation

- Automatically processes the ARS Turn Undead table.
- Supports the following results:
  - **T** — Turned.
  - **D** — Destroyed.
  - **D\*** — Affected creatures are destroyed, plus **2d4 additional creatures of the same category are Turned**.
- Limits the normal affected group to a maximum of **2d6 creatures**.
- Uses a **120 ft circular area** for the Turn Undead effect.
- Uses one d20 roll for all undead categories in the same turning attempt.
- Automatically rolls the required dice and applies the resulting effects.
- In mixed groups, applies the normal affected-creature limit to the lowest-HD creatures first.

### Intelligent Target Filtering

The module automatically excludes:

- The caster.
- Non-undead creatures.
- Dead creatures.
- Undead that have already been Turned.
- Undead outside the affected area.
- Undead hidden behind walls or closed doors.

Eligible targets are refreshed from the area placed through the native ARS Cast Shape action.

### Line of Sight

Turn Undead respects the physical layout of the scene:

- Walls are taken into account.
- Closed doors block the effect.
- Undead hidden behind an obstruction are not included among the affected targets.

### Cleric & Paladin Support

- Detects active **Cleric/Priest** and **Paladin** classes on the character.
- Uses the character's effective priest level when determining the Turn Undead result.
- Clerics and priests use their full class level.
- Paladins use the ARS progression with the **effective priest level penalty of 2 levels**.
- Uses the highest effective eligible level when a character has multiple eligible classes.
- If no eligible class is detected, the DM can enter a turning level manually and optionally apply the Paladin level adjustment.

### Turned and Destroyed Effects

Turned undead receive a dedicated **Turned** Active Effect.

- Duration: **10 rounds (1 turn / 10 minutes)**.
- The effect can be removed manually by the DM.
- This allows the DM to handle situations where the turning is broken early, such as when a Turned undead is forced to approach within 10 feet.

Destroyed undead receive a **Destroyed** Active Effect. Their hit points are also set to 0 when the module can identify the actor's HP field.

Effects can be applied through the GM when required, allowing players without direct ownership of an affected actor to resolve the result when an active GM is available.

### Unidentified Creatures

When ARS creature identification is disabled for players, the module respects the system's identification state and uses the appropriate player-facing creature name.

### Target Review

Before resolving the turning attempt, the DM can review eligible targets and correct an automatically detected undead category.

This is useful when an existing actor's name or Hit Dice do not accurately represent its category on the ARS turning table.

---

## 📦 Installation

### Foundry VTT — Manifest Installation

The easiest way to install the module is through Foundry VTT's **Install Module** window.

Copy this **Manifest URL**:

[ARS Turn Undead — Manifest URL](https://raw.githubusercontent.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/refs/heads/main/ars-turn-undead/module.json)

In Foundry:

1. Open **Add-on Modules → Install Module**.
2. Paste the Manifest URL into **Manifest URL**.
3. Click **Install**.
4. Enable **ARS Turn Undead** in your world.

### Direct Installation

The latest published release can be downloaded from:

[ARS Turn Undead — Latest Release](https://github.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/releases/latest)

For normal Foundry installation and future updates, the **Manifest URL method is recommended**.

---

## 🛠️ Compatibility

Current release compatibility:

- **Foundry Virtual Tabletop:** v14.
- **ARS:** v2.
- **ARS minimum version:** `2026.11.09`.

### Untested Systems

The module may potentially work with **OSRIC** or **ARS v1** because of shared framework functionality, but these systems are currently **untested and unsupported**.

---

## ⚠️ Known Limitations

### Automatic Category Detection

Automatic undead category detection uses actor Hit Dice and, where applicable, exact matches against standard undead names on the ARS turning table.

For example, an actor named exactly `Zombie` is assigned to the Zombie category. Other names and

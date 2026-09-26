# ARS Turn Undead

A custom **Turn Undead** module for the **ARS (Advanced Roleplaying System)** in Foundry Virtual Tabletop.

The module integrates with the native ARS action workflow to automate undead turning without replacing or overriding the system's core targeting and action mechanics.

## 🚀 Features

### Native ARS Integration

* Integrates directly with the standard **Cast Shape → Action/Macro** workflow.
* Preserves the native ARS action flow instead of replacing core system functionality.
* Designed specifically for **ARS v2**.

### Turn Undead Automation

* Automatically processes the ARS Turn Undead table.
* Supports the following results:

  * **T** — Turned
  * **D** — Destroyed
  * **D*** — Affected creatures are destroyed, plus **2d4 additional creatures of the same category are Turned**.
* Limits the normal affected group to a maximum of **2d6 creatures**.
* Uses a **120 ft circular area** for the Turn Undead effect.
* Automatically rolls the required dice and applies the resulting effects.

### Intelligent Target Filtering

The module automatically excludes:

* The caster.
* Non-undead creatures.
* Dead creatures.
* Undead that have already been Turned.
* Undead that cannot be reached because of walls or closed doors.

### Line of Sight

Turn Undead respects the physical layout of the scene:

* Walls are taken into account.
* Closed doors block the effect.
* Undead hidden behind an obstruction are not included among the affected targets.

### Cleric & Paladin Support

* Uses the character's effective priest level when determining the Turn Undead result.
* Correctly applies the ARS Paladin progression, including the **effective priest level penalty**.

### Turned Status

Turned undead receive a dedicated **Turned** Active Effect.

* Duration: **10 rounds (1 turn / 10 minutes)**.
* The effect can be removed manually by the DM.
* This allows the DM to handle situations where the turning is broken early, such as when a Turned undead is forced to approach within 10 feet.

### Unidentified Creatures

When ARS creature identification is disabled for players, the module respects the system's identification state and uses the appropriate player-facing creature name.

---

## 📦 Installation

### Foundry VTT — Manifest Installation

The easiest way to install the module is through Foundry VTT's **Install Module** window.

Copy this **Manifest URL**:

[ARS Turn Undead — Manifest URL](https://raw.githubusercontent.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/refs/heads/main/ars-turn-undead/module.json?utm_source=chatgpt.com)

In Foundry:

1. Open **Add-on Modules → Install Module**.
2. Paste the Manifest URL into **Manifest URL**.
3. Click **Install**.
4. Enable **ARS Turn Undead** in your world.

### Direct Installation

The current release can also be downloaded directly from the GitHub release:

[ARS Turn Undead — v1.2.8 ZIP](https://github.com/manuelmartinezesclapez-glitch/Turn-Undead-module-for-ARS/releases/download/v1.2.8/ars-turn-undead-v1.2.8.zip?utm_source=chatgpt.com)

For normal Foundry installation and future updates, the **Manifest URL method is recommended**.

---

## 🛠️ Compatibility

Tested and verified with:

* **Foundry Virtual Tabletop:** v14
* **ARS:** v2
* **ARS version tested:** `2026.09.21`

### Untested Systems

The module may potentially work with **OSRIC** or **ARS v1** because of shared framework functionality, but these systems are currently **untested and unsupported**.

---

## ⚠️ Known Limitations

### Automatic Category Detection

Automatic undead category detection is not always reliable with existing ARS actors.

For example, some creatures may be detected as the wrong category depending on how their actor data is configu

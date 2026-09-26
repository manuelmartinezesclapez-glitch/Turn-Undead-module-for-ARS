# ARS Turn Undead

A custom **Turn Undead** module designed for the **ARS (Advanced Old School RPG System)** framework in Foundry VTT. It integrates natively with the core action workflows to handle cleric and paladin turning mechanics smoothly without overriding core systems.

## 🚀 Features

* **Native Workflow Integration:** Uses the standard **Cast Shape → action/macro** flow instead of replacing the ARS targeting system.
* **Full Turn Undead Mechanics:**
  * Handles normal Turn Undead table results.
  * Supports `T` (Turned) and `D` (Destroyed) conditions.
  * Implements `D*` rules (affected creatures destroyed, plus **2d4 additional creatures** of the same type turned).
  * Limits targets to a maximum of **2d6 affected creatures** within a **120 ft circular area**.
* **Smart Filtering:** Automatically excludes non-undead targets, the caster, dead creatures, and already-Turned undead.
* **Line of Sight (LOS):** Checks walls and closed doors so obstructed undead are not affected.
* **Class & Progression Support:** Correctly calculates effective priest levels for Paladins.
* **Custom Status Effect:** Applies a custom **Turned** Active Effect lasting **10 rounds (1 turn)**, which the DM can easily remove manually if the effect is broken (e.g., if forced to approach within 10 feet).

## 🛠️ Compatibility

Tested and verified in the following environment:
* **Foundry VTT:** v14
* **ARS System:** v2 (Specifically tested with version `2026.09.21`)
* **Localization:** Spanish-localised environments.

*Note: It might work with OSRIC or ARS v1 due to shared framework logic, but these variants are currently untested and unverified.*

## 📦 Installation

To install the module, paste the following link into the **Install Module** manifest URL field in your Foundry VTT setup:

```text
https://github.com
```
*(Remember to replace `TU_USUARIO` with your actual GitHub username).*

## ⚠️ Known Rough Edges

* **Category Detection:** Automatic undead category detection is not always reliable with existing ARS actors (e.g., zombies might register as ghouls, or ghasts as shadows). However, the category can be adjusted manually in the dialogue before committing the action.
* **Targeting UI:** Creatures behind walls may still appear in the initial targets selection window, although the background LOS check will successfully prevent them from being affected.
* **Combat HUD:** When triggered from the Combat HUD, the action pop-out window may remain open after completion. Triggering the action from the Chat tab bypasses this aesthetic issue.
# Turn-Undead-module-for-ARS

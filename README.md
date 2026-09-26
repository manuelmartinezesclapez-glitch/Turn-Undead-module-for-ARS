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

*Note: It might work with OSRIC or ARS v1 due to shared framework logic, but these variants are currently untested and unverified.*

## ⚠️ Known Rough Edges

* **Category Detection:** Automatic undead category detection is not always reliable with existing ARS actors (e.g., zombies might register as ghouls, or ghasts as shadows). However, the category can be adjusted manually in the dialogue before committing the action.

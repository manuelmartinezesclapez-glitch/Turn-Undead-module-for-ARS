const TU_MODULE_ID = "ars-turn-undead";
const TU_FLAG_SCOPE = TU_MODULE_ID;
const TU_ITEM_FLAG = "turnUndeadItem";
const activeTurnUndeadActors = new Set();

const ICON_TURNED = "modules/ars-turn-undead/icons/turned.svg";
const ICON_DESTROYED = "icons/magic/unholy/silhouette-evil-horned-giant.webp";
const ICON_TURN_UNDEAD = "modules/ars-turn-undead/icons/turn-undead.svg";
const TURNED_DURATION_SECONDS = 10 * 60; // 1 turn = 10 rounds = 10 minutes in ARS

// ARS v2 turning table: columns are priest levels 1, 2, 3 ... 9, 10-11, 12-13, 14+.
const TURN_TABLE = [
  [10, 7, 4, "T", "T", "D", "D", "D*", "D*", "D*", "D*", "D*"],
  [13, 10, 7, 4, "T", "T", "D", "D", "D*", "D*", "D*", "D*"],
  [16, 13, 10, 7, 4, "T", "T", "D", "D", "D*", "D*", "D*"],
  [19, 16, 13, 10, 7, 4, "T", "T", "D", "D", "D*", "D*"],
  [20, 19, 16, 13, 10, 7, 4, "T", "T", "D", "D", "D*"],
  [null, 20, 19, 16, 13, 10, 7, 4, "T", "T", "D", "D"],
  [null, null, 20, 19, 16, 13, 10, 7, 4, "T", "T", "D"],
  [null, null, null, 20, 19, 16, 13, 10, 7, 4, "T", "T"],
  [null, null, null, null, 20, 19, 16, 13, 10, 7, 4, "T"],
  [null, null, null, null, null, 20, 19, 16, 13, 10, 7, 4],
  [null, null, null, null, null, null, 20, 19, 16, 13, 10, 7],
  [null, null, null, null, null, null, null, 20, 19, 16, 13, 10],
  [null, null, null, null, null, null, null, null, 20, 19, 16, 13]
];

const CATEGORY_LABELS = [
  "Skeleton / 1 HD",
  "Zombie",
  "Ghoul / 2 HD",
  "Shadow / 3-4 HD",
  "Wight / 5 HD",
  "Ghast",
  "Wraith / 6 HD",
  "Mummy / 7 HD",
  "Spectre / 8 HD",
  "Vampire / 9 HD",
  "Ghost / 10 HD",
  "Lich / 11+ HD",
  "Special"
];

function localize(key, data = {}) {
  const full = `ARS-TURN-UNDEAD.${key}`;
  return game.i18n.has(full) ? game.i18n.format(full, data) : key;
}

function normalizeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function isUndead(actor) {
  const type = String(actor?.system?.details?.type ?? actor?.system?.details?.race ?? "").toLowerCase();
  return type.split(/[,/]/).map(s => s.trim()).includes("undead") || type.includes("undead");
}

function isAlreadyTurnedOrDead(actor) {
  if (!actor) return true;
  const hasTurned = actor.effects?.some(effect =>
    !effect.disabled && (effect.statuses?.has?.("turned") || effect.getFlag?.(TU_FLAG_SCOPE, "turnEffect") === "turned")
  );
  if (hasTurned) return true;

  const hasDead = actor.effects?.some(effect =>
    !effect.disabled && (effect.statuses?.has?.("dead") || effect.getFlag?.(TU_FLAG_SCOPE, "turnEffect") === "destroyed")
  );
  if (hasDead) return true;

  const hp = findHPPath(actor);
  if (hp && Number.isFinite(hp.value) && hp.value <= 0) return true;
  return false;
}

/**
 * ARS has used several locations for NPC Hit Dice across data revisions.
 * Read the common locations first, then recursively locate a hitdice/HD field.
 */
function parseHitDice(actor) {
  const candidates = [
    actor?.system?.hitdice,
    actor?.system?.details?.hitdice,
    actor?.system?.details?.hd,
    actor?.system?.hd,
    actor?.system?.hitDice
  ];
  let raw = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== "");

  if (raw === undefined) {
    const queue = [actor?.system];
    const seen = new Set();
    while (queue.length && raw === undefined) {
      const value = queue.shift();
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (/^(hitdice|hitDice|hd)$/i.test(key) && (typeof child === "string" || typeof child === "number")) {
          raw = child;
          break;
        }
        if (child && typeof child === "object") queue.push(child);
      }
    }
  }

  raw = String(raw ?? "").trim();
  if (!raw) return 0;
  const fraction = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const match = raw.match(/^(\d+(?:\.\d+)?)/);
  if (match) return Number(match[1]);
  return 0;
}

function categoryForHD(hd) {
  const n = Number(hd);
  if (!Number.isFinite(n) || n <= 1) return 0;
  if (n <= 2) return 2;
  if (n <= 4) return 3;
  if (n <= 5) return 4;
  if (n <= 6) return 6;
  if (n <= 7) return 7;
  if (n <= 8) return 8;
  if (n <= 9) return 9;
  if (n <= 10) return 10;
  return 11;
}

function inferCategory(actor, hd) {
  // Exact monster names take precedence when they correspond to a dedicated
  // ARS turning-table category. Variants such as "Zombie Lord" remain HD-based.
  const exactName = normalizeName(actor?.name);
  const exactCategories = new Map([
    ["skeleton", 0], ["zombie", 1], ["ghoul", 2], ["shadow", 3],
    ["wight", 4], ["ghast", 5], ["wraith", 6], ["mummy", 7],
    ["spectre", 8], ["specter", 8], ["vampire", 9], ["ghost", 10],
    ["lich", 11]
  ]);
  if (exactCategories.has(exactName)) return exactCategories.get(exactName);
  return categoryForHD(hd);
}

function turningClass(actor) {
  if (!actor || actor.type !== "character") return null;
  const classes = actor.classes ?? [];
  const eligible = [];
  for (const cls of classes) {
    if (!cls?.system?.active) continue;
    const name = normalizeName(cls.name);
    const level = Number(actor.getClassLevel?.(cls) ?? 0);
    if (!Number.isFinite(level) || level < 1) continue;
    if (name === "cleric") eligible.push({ type: "cleric", level, effectiveLevel: level });
    if (name === "paladin") eligible.push({ type: "paladin", level, effectiveLevel: level - 2 });
  }
  if (!eligible.length) return null;
  eligible.sort((a, b) => b.effectiveLevel - a.effectiveLevel);
  return eligible[0];
}

async function getTurningProfile(actor) {
  const detected = turningClass(actor);
  if (detected) {
    return {
      ...detected,
      priestLevel: detected.effectiveLevel,
      manual: false
    };
  }

  const content = `<p>${localize("manualCasterDescription")}</p>
    <div class="form-group"><label>${localize("turningLevel")}</label>
      <input type="number" name="turningLevel" min="1" max="30" step="1" value="1"></div>
    <div class="form-group"><label><input type="checkbox" name="paladinRule"> ${localize("paladinRule")}</label></div>`;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: localize("dialogTitle") },
    content,
    modal: true,
    buttons: [
      { action: "cancel", label: localize("cancel"), icon: "fas fa-times" },
      {
        action: "continue",
        label: localize("turn"),
        icon: "fas fa-sun",
        default: true,
        callback: (event, button) => {
          const form = button.form;
          const level = Number(form.elements.turningLevel?.value ?? 0);
          const paladin = !!form.elements.paladinRule?.checked;
          return { level, paladin };
        }
      }
    ]
  });

  if (!result) return null;
  const priestLevel = result.paladin ? result.level - 2 : result.level;
  return {
    type: result.paladin ? "paladin" : "manual",
    level: result.level,
    effectiveLevel: priestLevel,
    priestLevel,
    manual: true
  };
}

function tableResult(category, priestLevel, rollTotal) {
  const levelIndex = priestLevel >= 14 ? 11
    : priestLevel >= 12 ? 10
    : priestLevel >= 10 ? 9
    : priestLevel - 1;
  if (levelIndex < 0 || levelIndex > 11) return { code: null, threshold: null };
  const code = TURN_TABLE[category][levelIndex];
  if (code === null) return { code: null, threshold: null };
  if (typeof code === "number") return { code: rollTotal >= code ? "T" : "F", threshold: code };
  return { code, threshold: null };
}

function playerFacingName(token) {
  const actor = token?.actor;
  if (!actor) return token?.name ?? "Unknown";
  const identificationEnabled = game.ars?.config?.settings?.identificationActor
    ?? game.settings?.get?.("ars", "identificationActor");
  const isNpc = ["npc", "lootable"].includes(actor.type);
  const identified = actor.system?.attributes?.identified === true;
  if (identificationEnabled && isNpc && !identified) {
    return actor.system?.alias || actor.alias || game.i18n.localize("ARS.unknownActor");
  }
  return actor.name || token.name || "Unknown";
}

async function showTargetDialog(targets) {
  const rows = targets.map((token, index) => {
    const actor = token.actor;
    const hd = parseHitDice(actor);
    const category = inferCategory(actor, hd);
    return {
      index,
      tokenId: token.id,
      actorUuid: actor.uuid,
      name: playerFacingName(token),
      img: actor.img,
      hd,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      categoryOptions: CATEGORY_LABELS.map((label, optionIndex) => ({
        label,
        value: optionIndex,
        selected: optionIndex === category
      }))
    };
  });

  const content = await foundry.applications.handlebars.renderTemplate(
    `modules/${TU_MODULE_ID}/templates/turn-undead-dialog.hbs`,
    { rows, description: localize("dialogDescription") }
  );

  return foundry.applications.api.DialogV2.wait({
    window: { title: localize("dialogTitle") },
    classes: ["ars-turn-undead-dialog"],
    content,
    modal: true,
    buttons: [
      { action: "cancel", label: localize("cancel"), icon: "fas fa-times" },
      {
        action: "turn",
        label: localize("turn"),
        icon: "fas fa-sun",
        default: true,
        callback: (event, button) => {
          const form = button.form;
          return rows.map(row => {
            const rawCategory = Number(form.elements[`category-${row.index}`]?.value);
            const category = Number.isInteger(rawCategory) && rawCategory >= 0 && rawCategory < CATEGORY_LABELS.length
              ? rawCategory
              : row.category;
            return {
              ...row,
              category,
              categoryLabel: CATEGORY_LABELS[category]
            };
          });
        }
      }
    ]
  });
}

function ensureTurnedStatus() {
  if (!Array.isArray(CONFIG.statusEffects)) return;
  if (CONFIG.statusEffects.some(status => status?.id === "turned")) return;
  CONFIG.statusEffects.push({
    id: "turned",
    name: "ARS-TURN-UNDEAD.turned",
    img: ICON_TURNED
  });
  console.info(`[${TU_MODULE_ID}] Registered custom status effect: turned`);
}

function makeEffectData(kind, caster) {
  const statusId = kind === "turned" ? "turned" : "dead";
  const status = CONFIG.statusEffects.find(effect => effect?.id === statusId);

  return {
    name: kind === "turned" ? localize("turned") : localize("destroyed"),
    img: status?.img ?? (kind === "turned" ? ICON_TURNED : ICON_DESTROYED),
    disabled: false,
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    statuses: new Set([statusId]),
    changes: [],
    // In ARS, one turn is 10 rounds. Turned undead remain turned for one turn.
    // Using ARS' native seconds-based duration lets the system expire the effect
    // automatically while still allowing the GM to delete the Active Effect early.
    duration: kind === "turned"
      ? { rounds: TURNED_DURATION_SECONDS, units: "seconds" }
      : {},
    flags: {
      [TU_FLAG_SCOPE]: {
        turnEffect: kind,
        casterUuid: caster.uuid
      }
    }
  };
}

function findHPPath(actor) {
  const system = actor?.system;
  if (!system || typeof system !== "object") return null;

  const preferredKeys = ["hp", "hitpoints", "hitPoints", "health"];
  const seen = new Set();
  const queue = [{ value: system, path: "system" }];

  while (queue.length) {
    const { value, path } = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);

    for (const key of preferredKeys) {
      const candidate = value[key];
      if (candidate && typeof candidate === "object" && Number.isFinite(Number(candidate.value))) {
        return { path: `${path}.${key}.value`, value: Number(candidate.value), max: Number(candidate.max ?? NaN) };
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (!child || typeof child !== "object" || seen.has(child)) continue;
      queue.push({ value: child, path: `${path}.${key}` });
    }
  }
  return null;
}

async function setDestroyedHP(actor) {
  const hp = findHPPath(actor);
  if (!hp) {
    console.warn(`[${TU_MODULE_ID}] Could not locate HP value for destroyed undead:`, actor?.uuid);
    return false;
  }
  await actor.update({ [hp.path]: 0 });
  return true;
}

async function applyEffectAsGM(actorUuid, effectData) {
  const actor = await fromUuid(actorUuid);
  if (!actor) return false;

  const kind = effectData.flags?.[TU_FLAG_SCOPE]?.turnEffect;
  const existing = actor.effects.filter(e => e.getFlag?.(TU_FLAG_SCOPE, "turnEffect") === kind);
  if (existing.length) await actor.deleteEmbeddedDocuments("ActiveEffect", existing.map(e => e.id));

  if (kind === "destroyed") {
    await setDestroyedHP(actor);
  }

  // Use the same ActiveEffect creation path as ARS itself. This ensures the
  // ARS ActiveEffect data model receives the status Set and icon/display data
  // exactly as native ARS effects do.
  await ActiveEffect.implementation.create(effectData, { parent: actor });

  // Explicitly activate the status as well. ARS exposes the status through the
  // actor's status set, which is what the token HUD and token display consume.
  const statusId = kind === "turned" ? "turned" : "dead";
  if (typeof actor.toggleStatusEffect === "function") {
    const alreadyActive = actor.effects.some(effect =>
      effect.statuses?.has?.(statusId) && !effect.disabled
    );
    if (!alreadyActive) await actor.toggleStatusEffect(statusId, { active: true });
  }

  return true;
}

function registerSocket() {
  game.socket.on(`module.${TU_MODULE_ID}`, async payload => {
    if (!game.user.isGM || !payload?.action) return;
    if (payload.gmId && payload.gmId !== game.user.id) return;
    if (payload.action === "apply-effect") {
      await applyEffectAsGM(payload.actorUuid, payload.effect);
    }
  });
}

async function applyEffect(entry, kind, caster) {
  const effect = makeEffectData(kind, caster);
  if (game.user.isGM || entry.actor.isOwner) {
    if (game.user.isGM) {
      await applyEffectAsGM(entry.actor.uuid, effect);
      return;
    }
  }

  const gm = game.users.find(u => u.active && u.isGM);
  if (!gm) {
    ui.notifications.warn("No active GM is available to apply the Turn Undead effect.");
    return;
  }
  game.socket.emit(`module.${TU_MODULE_ID}`, {
    action: "apply-effect",
    gmId: gm.id,
    actorUuid: entry.actor.uuid,
    effect
  });
}

async function postResults(caster, profile, resolved, affected, rollTotal, maxAffected, additionalTurned = [], dStarGroups = new Map()) {
  const affectedSet = new Set(affected.map(e => e.tokenId));
  const additionalTurnedSet = new Set(additionalTurned.map(e => e.tokenId));
  const resultRows = resolved.map(entry => {
    const destroyedHere = affectedSet.has(entry.tokenId);
    const turnedHere = additionalTurnedSet.has(entry.tokenId);
    let result = entry.result;
    if (destroyedHere && (result === "D" || result === "D*")) result = "D";
    else if (destroyedHere && result === "T") result = "T";
    else if (turnedHere) result = "T";
    else if (["T", "T*", "D", "D*"].includes(result)) result = "F";

    const resultLabel = result === "T" ? localize("turned")
      : result === "D" ? localize("destroyed")
      : result === "F" ? localize("failed")
      : localize("impossible");
    let detail = entry.threshold
      ? localize("successThreshold", { threshold: entry.threshold })
      : (["T", "D"].includes(result) ? localize("automatic") : localize("noChance"));
    if (entry.result === "D*" && dStarGroups.has(entry.category)) {
      detail += ` — ${localize("additionalTurnedCount", { count: dStarGroups.get(entry.category) })}`;
    }
    return `<tr><td>${foundry.utils.escapeHTML(entry.name)}</td><td>${entry.hd}</td><td>${foundry.utils.escapeHTML(CATEGORY_LABELS[entry.category])}</td><td>${foundry.utils.escapeHTML(resultLabel)}</td><td>${foundry.utils.escapeHTML(detail)}</td></tr>`;
  }).join("");

  const content = `<div class="ars-tu-chat-card">
    <h3>${localize("turningAction")}</h3>
    <p><strong>${foundry.utils.escapeHTML(caster.name)}</strong> — ${foundry.utils.escapeHTML(profile.type === "paladin" ? localize("paladin") : profile.type === "cleric" ? localize("cleric") : localize("manual"))} ${profile.level}</p>
    <p>${localize("priestLevel")}: <strong>${profile.priestLevel}</strong></p>
    <p>${localize("roll")}: <strong>${rollTotal}</strong> &nbsp; ${localize("affected")}: <strong>${maxAffected}</strong>${additionalTurned.length ? ` &nbsp; ${localize("additionalTurned")}: <strong>${additionalTurned.length}</strong>` : ""}</p>
    <table><thead><tr><th>${localize("target")}</th><th>${localize("hd")}</th><th>${localize("category")}</th><th>${localize("turningAction")}</th><th></th></tr></thead><tbody>${resultRows}</tbody></table>
  </div>`;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: caster }),
    content,
    flags: { [TU_FLAG_SCOPE]: { result: resolved.map(r => ({ tokenId: r.tokenId, result: r.result })) } }
  });
}

let lastTurnUndeadRegion = null;
let lastTurnUndeadRegionTime = 0;

function tokenCenter(token) {
  if (!token) return null;
  if (typeof token.getCenterPoint === "function") return token.getCenterPoint();
  return {
    x: token.center?.x ?? token.x + (token.w ?? 0) / 2,
    y: token.center?.y ?? token.y + (token.h ?? 0) / 2
  };
}

function hasLineOfSight(sourcePoint, targetPoint) {
  if (!sourcePoint || !targetPoint) return true;
  if (typeof canvas?.walls?.checkCollision === "function" && typeof Ray === "function") {
    try {
      const ray = new Ray(sourcePoint, targetPoint);
      return !canvas.walls.checkCollision(ray, { type: "sight", mode: "any" });
    } catch (error) {
      console.warn(`[${TU_MODULE_ID}] Wall sight-collision test failed; trying polygon fallback.`, error);
    }
  }
  const Polygon = foundry?.canvas?.geometry?.ClockwiseSweepPolygon
    ?? foundry?.canvas?.geometry?.PointSourcePolygon;
  if (!Polygon?.testCollision) return true;
  try {
    return !Polygon.testCollision(sourcePoint, targetPoint, { type: "sight", mode: "any" });
  } catch (error) {
    console.warn(`[${TU_MODULE_ID}] Sight collision fallback failed; leaving target eligible.`, error);
    return true;
  }
}

function regionCircleData(region) {
  const shapes = region?.document?.shapes ?? region?.shapes ?? [];
  return shapes.find(shape => shape?.type === "circle") ?? null;
}

function findRecentTurnUndeadRegion(sourceToken) {
  const sourcePoint = tokenCenter(sourceToken);
  const now = Date.now();
  if (lastTurnUndeadRegion && now - lastTurnUndeadRegionTime <= 120000) {
    const shape = regionCircleData(lastTurnUndeadRegion);
    if (shape) return { region: lastTurnUndeadRegion, shape };
  }

  const regions = Array.from(canvas?.regions?.placeables ?? []);
  const candidates = regions
    .map(region => ({
      region,
      shape: regionCircleData(region),
      created: Number(region.document?._stats?.createdTime ?? 0)
    }))
    .filter(entry => {
      if (!entry.shape) return false;
      if (!sourcePoint) return true;
      const center = entry.shape.center ?? { x: entry.shape.x, y: entry.shape.y };
      const radius = Number(entry.shape.radius ?? 0);
      if (!Number.isFinite(radius) || radius <= 0) return false;
      return Math.hypot(center.x - sourcePoint.x, center.y - sourcePoint.y) <= radius + 10;
    })
    .filter(entry => now - entry.created <= 120000 || !entry.created)
    .sort((a, b) => b.created - a.created);
  return candidates[0] ?? null;
}

function tokenInsideCircle(token, shape) {
  if (!token || !shape) return false;
  const origin = shape.center ?? { x: shape.x, y: shape.y };
  const radius = Number(shape.radius ?? 0);
  if (!Number.isFinite(radius) || radius <= 0) return false;

  // Match the native ARS circle-selection behaviour more closely: a token is
  // inside when its centre or one of its corners intersects the circle.
  const bounds = token.bounds;
  const center = tokenCenter(token);
  const points = [];
  if (bounds) {
    points.push(
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom }
    );
  }
  if (center) points.push(center);
  return points.some(point => Math.hypot(point.x - origin.x, point.y - origin.y) <= radius);
}

function clearTurnUndeadTargets() {
  // ARS v2 uses this internal updater itself when cancelling native Cast Shape.
  // It is the reliable way to clear the targets selected by the native
  // selection:"all" preview; game.user.updateTokenTargets does not exist here.
  if (typeof game.user._onUpdateTokenTargets === "function") {
    game.user._onUpdateTokenTargets([]);
    return;
  }
  for (const token of Array.from(game.user.targets ?? [])) {
    try {
      token.setTarget(false, { user: game.user, releaseOthers: false, groupSelection: true });
    } catch (error) {
      console.warn(`[${TU_MODULE_ID}] Could not clear target ${token?.name ?? token?.id}.`, error);
    }
  }
}

function markTurnUndeadTargets(tokens) {
  for (const token of tokens) {
    try {
      token.setTarget(true, { user: game.user, releaseOthers: false, groupSelection: true });
    } catch (error) {
      console.warn(`[${TU_MODULE_ID}] Could not mark target ${token?.name ?? token?.id}.`, error);
    }
  }
}

function refreshTurnUndeadTargets(caster, sourceToken) {
  const eligible = [];
  const area = findRecentTurnUndeadRegion(sourceToken);
  const sourcePoint = tokenCenter(sourceToken);

  clearTurnUndeadTargets();

  for (const token of canvas?.tokens?.placeables ?? []) {
    const actor = token?.actor;
    if (token === sourceToken || actor?.uuid === caster?.uuid) continue;
    if (!actor || !isUndead(actor) || isAlreadyTurnedOrDead(actor)) continue;
    if (!area || !tokenInsideCircle(token, area.shape)) continue;
    if (sourcePoint && !hasLineOfSight(sourcePoint, tokenCenter(token))) continue;
    eligible.push(token);
  }

  markTurnUndeadTargets(eligible);
  return eligible;
}

async function closeTurnUndeadActionCard(sourceToken) {
  const tokenObject = sourceToken?.object ?? sourceToken;
  const tokenId = tokenObject?.id ?? sourceToken?.id;
  const actorUuid = tokenObject?.actor?.uuid ?? sourceToken?.actor?.uuid;
  const closed = new Set();

  // ARSCardPopout registers itself in the token's popoutCards collection only
  // when a Combat HUD exists. Close those cards first when available.
  for (const card of Array.from(tokenObject?.popoutCards ?? [])) {
    if (!card || closed.has(card)) continue;
    try {
      await card.close();
      closed.add(card);
    } catch (error) {
      console.warn(`[${TU_MODULE_ID}] Could not close the ARS action card.`, error);
    }
  }

  // ARS v2 uses Foundry's ApplicationV2 instance registry for every rendered
  // ARSCardPopout. This registry is a Map, not a callable function.
  const instances = foundry?.applications?.instances;
  if (!instances?.values) return;

  for (const app of Array.from(instances.values())) {
    if (!app?.rendered || closed.has(app)) continue;

    const classes = app.constructor?.DEFAULT_OPTIONS?.classes ?? app.options?.classes ?? [];
    const classList = Array.isArray(classes) ? classes : [classes];
    const isArsPopout = app.constructor?.name === "ARSCardPopout"
      || classList.includes("popoutCard");
    if (!isArsPopout) continue;

    const appToken = app.token?.object ?? app.token;
    const appTokenId = appToken?.id ?? app.token?.id;
    const appActorUuid = app.actor?.uuid ?? appToken?.actor?.uuid;
    if ((tokenId && appTokenId === tokenId) || (actorUuid && appActorUuid === actorUuid)) {
      try {
        await app.close();
        closed.add(app);
      } catch (error) {
        console.warn(`[${TU_MODULE_ID}] Could not close the ARS action popout.`, error);
      }
    }
  }
}

async function performTurnUndead(sourceActor, sourceToken) {
  const caster = sourceActor ?? sourceToken?.actor;
  if (!caster) {
    ui.notifications.error("Unable to determine the actor using Turn Undead.");
    return;
  }

  // The ARS HUD can dispatch both the DOM click and the embedded macro.
  // Prevent the same Turn Undead action from being resolved twice.
  const executionKey = caster.uuid;
  if (activeTurnUndeadActors.has(executionKey)) return;
  activeTurnUndeadActors.add(executionKey);

  try {
    const profile = await getTurningProfile(caster);
    if (!profile) return;
    if (profile.priestLevel < 1) {
      ui.notifications.warn(localize("badLevel"));
      return;
    }

    const targetTokens = refreshTurnUndeadTargets(caster, sourceToken);
    if (!targetTokens.length) {
      ui.notifications.warn(localize("noUndeadTargets"));
      return;
    }

    const confirmed = await showTargetDialog(targetTokens);
    if (!Array.isArray(confirmed) || confirmed.length === 0) return;

    const d20 = await new Roll("1d20").evaluate();
    const rollTotal = Number(d20.total ?? 0);

    // One d20 is used for every undead type in the same turning attempt.
    const resolved = confirmed.map(entry => {
      const token = targetTokens.find(t => t.id === entry.tokenId);
      const actor = token?.actor;
      const result = tableResult(entry.category, profile.priestLevel, rollTotal);
      return {
        ...entry,
        token,
        actor,
        result: result.code,
        threshold: result.threshold
      };
    }).sort((a, b) => a.hd - b.hd || a.name.localeCompare(b.name));

    const successful = resolved.filter(e => ["T", "D", "D*"].includes(e.result));
    const maxAffected = successful.length ? Number((await new Roll("2d6").evaluate()).total ?? 0) : 0;
    let remaining = maxAffected;
    const affected = [];

    // Mixed groups: lowest HD creatures are affected first.
    for (const entry of resolved) {
      if (remaining <= 0) break;
      if (!["T", "D", "D*"].includes(entry.result)) continue;
      affected.push(entry);
      remaining--;
    }

    // A result of D* means the creatures selected by the normal 2d6 limit are
    // destroyed, plus an additional 2d4 creatures of the same type are turned.
    // The additional creatures are NOT destroyed and are not limited to entries
    // which themselves rolled D*: they are simply additional creatures of that
    // same undead category in the affected area.
    const dStarGroups = new Map();
    for (const entry of resolved) {
      if (entry.result !== "D*") continue;
      if (!dStarGroups.has(entry.category)) {
        const extra = Number((await new Roll("2d4").evaluate()).total ?? 0);
        dStarGroups.set(entry.category, extra);
      }
    }

    const additionalTurned = [];
    for (const [category, extra] of dStarGroups) {
      let left = extra;
      for (const entry of resolved) {
        if (!left) break;
        if (entry.category !== category || affected.includes(entry) || additionalTurned.includes(entry)) continue;
        additionalTurned.push(entry);
        left--;
      }
    }

    await postResults(caster, profile, resolved, affected, rollTotal, maxAffected, additionalTurned, dStarGroups);
    await closeTurnUndeadActionCard(sourceToken);

    for (const entry of affected) {
      const kind = entry.result === "T" ? "turned" : "destroyed";
      await applyEffect(entry, kind, caster);
    }
    for (const entry of additionalTurned) {
      await applyEffect(entry, "turned", caster);
    }
  } finally {
    activeTurnUndeadActors.delete(executionKey);
  }
}

function abilityData() {
  return {
    name: localize("turningAction"),
    type: "ability",
    img: ICON_TURN_UNDEAD,
    flags: { [TU_FLAG_SCOPE]: { [TU_ITEM_FLAG]: true, version: 3 } },
    system: {
      description: "<p>ARS v2 Turn Undead. Place the area first; eligible undead in the area are selected automatically.</p>",
      dmonlytext: "",
      actionGroups: [{
        id: foundry.utils.randomID(16),
        name: localize("turningAction"),
        img: ICON_TURN_UNDEAD,
        description: "ARS v2 Turn Undead",
        sort: 0,
        collapsedState: "none",
        origin: { name: "", level: 0, school: "", sphere: "" },
        actions: [
          {
            id: foundry.utils.randomID(16),
            sort: 0,
            name: "Place Shape",
            img: ICON_TURN_UNDEAD,
            type: "castshape",
            speed: 0,
            targeting: "",
            successAction: "",
            formula: "",
            ability: "none",
            abilityCheck: { type: "none", formula: "" },
            saveCheck: { type: "none", formula: "" },
            castShape: {
              shape: { type: "circle" },
              coneShape: { type: "circle" },
              selection: { type: "all" },
              properties: {
                radius: { formula: "120" },
                range: { formula: "120" },
                angle: { formula: "" },
                length: { formula: "" },
                width: { formula: "" },
                inRangeColor: "#f2ed69",
                outOfRangeColor: "#a80000"
              }
            },
            misc: "120 ft"
          },
          {
            id: foundry.utils.randomID(16),
            sort: 1,
            name: "Turn Undead",
            img: ICON_TURN_UNDEAD,
            type: "macro",
            speed: 0,
            targeting: "",
            successAction: "",
            formula: "",
            ability: "none",
            abilityCheck: { type: "none", formula: "" },
            saveCheck: { type: "none", formula: "" },
            macro: { script: `await game.modules.get("${TU_MODULE_ID}")?.api?.turnUndead(sourceActor, sourceToken);` }
          }
        ]
      }]
    }
  };
}

async function ensureWorldItem() {
  if (!game.user.isGM) return;
  const existing = game.items.find(item => item.getFlag?.(TU_FLAG_SCOPE, TU_ITEM_FLAG));
  if (existing) {
    const updates = {};
    if (existing.img !== ICON_TURN_UNDEAD) updates.img = ICON_TURN_UNDEAD;
    const desiredActions = abilityData().system.actionGroups[0].actions;
    const groups = existing.system?.actionGroups ?? [];
    const firstGroup = groups[0];
    if (firstGroup?.actions?.[0] && firstGroup?.actions?.[1]) {
      const migratedActions = foundry.utils.deepClone(desiredActions);
      migratedActions[0].id = firstGroup.actions[0].id;
      migratedActions[1].id = firstGroup.actions[1].id;
      updates["system.actionGroups.0.actions"] = migratedActions;
      updates["system.actionGroups.0.description"] = "ARS v2 Turn Undead";
    }
    const needsActionMigration = !firstGroup
      || firstGroup.actions?.[0]?.type !== "castshape"
      || firstGroup.actions?.[1]?.type !== "macro"
      || firstGroup.actions?.[0]?.castShape?.properties?.radius?.formula !== "120";
    if (needsActionMigration) {
      updates["system.actionGroups"] = [{
        ...(firstGroup ?? {}),
        id: firstGroup?.id ?? foundry.utils.randomID(16),
        name: localize("turningAction"),
        img: ICON_TURN_UNDEAD,
        description: "ARS v2 Turn Undead",
        sort: 0,
        collapsedState: "none",
        origin: { name: "", level: 0, school: "", sphere: "" },
        actions: desiredActions
      }];
    } else {
      const actionGroupUpdates = {};
      groups.forEach((group, groupIndex) => {
        if (group.img !== ICON_TURN_UNDEAD) actionGroupUpdates[`system.actionGroups.${groupIndex}.img`] = ICON_TURN_UNDEAD;
        for (const [actionIndex, action] of (group.actions ?? []).entries()) {
          if (action.img !== ICON_TURN_UNDEAD) {
            actionGroupUpdates[`system.actionGroups.${groupIndex}.actions.${actionIndex}.img`] = ICON_TURN_UNDEAD;
          }
        }
      });
      Object.assign(updates, actionGroupUpdates);
    }
    if (Object.keys(updates).length) await existing.update(updates);

    // Also migrate copies previously dragged from the World Item.
    for (const actor of game.actors ?? []) {
      const copies = actor.items?.filter(item => item.getFlag?.(TU_FLAG_SCOPE, TU_ITEM_FLAG));
      for (const copy of copies ?? []) {
        const copyGroups = copy.system?.actionGroups ?? [];
        if (!copyGroups[0] || copyGroups[0].actions?.[0]?.type !== "castshape" || copyGroups[0].actions?.[1]?.type !== "macro" || copyGroups[0].actions?.[0]?.castShape?.properties?.radius?.formula !== "120") {
          await copy.update({ "system.actionGroups": [{
            ...(copyGroups[0] ?? {}),
            id: copyGroups[0]?.id ?? foundry.utils.randomID(16),
            name: localize("turningAction"),
            img: ICON_TURN_UNDEAD,
            description: "ARS v2 Turn Undead",
            sort: 0,
            collapsedState: "none",
            origin: { name: "", level: 0, school: "", sphere: "" },
            actions: foundry.utils.deepClone(desiredActions)
          }] });
        }
      }
    }

    console.info(`[${TU_MODULE_ID}] Turn Undead world item already exists:`, existing.uuid);
    return;
  }

  try {
    const created = await Item.create(abilityData());
    if (created) {
      console.info(`[${TU_MODULE_ID}] Created Turn Undead world item:`, created.uuid);
      ui.notifications.info(localize("itemCreated"));
    }
  } catch (error) {
    console.error(`[${TU_MODULE_ID}] Failed to create Turn Undead world item`, error);
    ui.notifications.error(localize("createFailed"));
  }
}

// Foundry v14 stores ARS Cast Shape geometry in Scene Regions. Cache the
// latest circular region so the native Place Shape action remains untouched.
Hooks.on("createRegion", (region) => {
  if (!regionCircleData(region)) return;
  lastTurnUndeadRegion = region;
  lastTurnUndeadRegionTime = Date.now();
});

// ARS natively executes both castshape and macro actions from the HUD/chat action tree.
// Do not intercept those clicks: doing so prevents the native Cast Shape workflow
// and can cause the macro action to run in the wrong place.

Hooks.once("init", () => {
  ensureTurnedStatus();
  const module = game.modules.get(TU_MODULE_ID);
  module.api = {
    turnUndead: performTurnUndead,
    createTurnUndeadItem: async () => {
      if (!game.user.isGM) return null;
      const existing = game.items.find(item => item.getFlag?.(TU_FLAG_SCOPE, TU_ITEM_FLAG));
      return existing ?? Item.create(abilityData());
    },
    getTurningProfile,
    inferCategory,
    TURN_TABLE
  };
});

Hooks.once("ready", async () => {
  registerSocket();
  await ensureWorldItem();
});


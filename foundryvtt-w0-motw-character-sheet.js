// Import TypeScript modules
import { registerSettings } from './module/settings.js';
import { log, getActivationType, getWeaponRelevantAbility } from "./helpers.js";
import { preloadTemplates } from './module/preloadTemplates.js';
import { MODULE_ID, MySettings } from './constants.js';
//@ts-ignore
import ActorSheet5eCharacter from '../../systems/dnd5e/module/actor/sheets/character.js';
Handlebars.registerHelper('cb5es-path', (relativePath) => {
    return `modules/${MODULE_ID}/${relativePath}`;
});
Handlebars.registerHelper('cb5es-safeVal', (value, fallback) => {
    return new Handlebars.SafeString(value || fallback);
});
Handlebars.registerHelper('cb5es-add', (value, toAdd) => {
    return new Handlebars.SafeString(String(value + toAdd));
});
Handlebars.registerHelper('cb5es-isEmpty', (input) => {
    if (!input) {
        return true;
    }
    if (input instanceof Array) {
        return input.length < 1;
    }
    if (input instanceof Set) {
        return input.size < 1;
    }
    return isObjectEmpty(input);
});
export class CompactBeyond5eSheet extends ActorSheet5eCharacter {
    get template() {
        //@ts-ignore
        if (!game.user.isGM && this.actor.limited && !game.settings.get(MODULE_ID, MySettings.expandedLimited)) {
            return `modules/${MODULE_ID}/templates/character-sheet-ltd.hbs`;
        }
        return `modules/${MODULE_ID}/templates/character-sheet.hbs`;
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: ['dnd5e', 'sheet', 'actor', 'character', 'cb5es'],
            scrollY: [...options.scrollY, '.sheet-sidebar'],
            height: 680,
        });
        return options;
    }
    getData() {
        var _a, _b, _c;
        const sheetData = super.getData();
        // within each activation time, we want to display: Items which do damange, Spells which do damage, Features
        // MUTATED
        const actionsData = {
            action: new Set(),
            bonus: new Set(),
            reaction: new Set(),
            special: new Set(),
        };
        try {
            // digest all weapons equipped populate the actionsData appropriate categories
            const weapons = (_a = sheetData === null || sheetData === void 0 ? void 0 : sheetData.inventory.find(({ label }) => label.includes('Weapon'))) === null || _a === void 0 ? void 0 : _a.items; // brittle?
            const equippedWeapons = weapons.filter(({ data }) => data.equipped) || [];
            // MUTATES actionsData
            equippedWeapons.forEach((item) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const attackBonus = (_a = item.data) === null || _a === void 0 ? void 0 : _a.attackBonus;
                // FIXME this has to be set by the user, perhaps we can infer from the `actor.traits.weaponProf`
                const prof = ((_b = item.data) === null || _b === void 0 ? void 0 : _b.proficient) ? sheetData.data.attributes.prof : 0;
                const actionType = (_c = item.data) === null || _c === void 0 ? void 0 : _c.actionType;
                const actionTypeBonus = Number(((_e = (_d = sheetData.data.bonuses) === null || _d === void 0 ? void 0 : _d[actionType]) === null || _e === void 0 ? void 0 : _e.attack) || 0);
                const relevantAbility = getWeaponRelevantAbility(item.data, sheetData.data);
                const relevantAbilityMod = (_f = sheetData.data.abilities[relevantAbility]) === null || _f === void 0 ? void 0 : _f.mod;
                const toHit = actionTypeBonus + relevantAbilityMod + attackBonus + prof;
                const activationType = getActivationType((_h = (_g = item.data) === null || _g === void 0 ? void 0 : _g.activation) === null || _h === void 0 ? void 0 : _h.type);
                actionsData[activationType].add(Object.assign(Object.assign({}, item), { labels: Object.assign(Object.assign({}, item.labels), { toHit: String(toHit) }) }));
            });
        }
        catch (e) {
            log(true, 'error trying to digest inventory', e);
        }
        try {
            // digest all prepared spells and populate the actionsData appropriate categories
            // MUTATES actionsData
            sheetData === null || sheetData === void 0 ? void 0 : sheetData.spellbook.forEach(({ spells, label }) => {
                // if the user only wants cantrips here, no nothing if the label does not include "Cantrip"
                if (game.settings.get(MODULE_ID, MySettings.limitActionsToCantrips)) {
                    // brittle
                    if (!label.includes('Cantrip')) {
                        return;
                    }
                }
                const preparedSpells = spells.filter(({ data }) => {
                    var _a, _b;
                    // always count cantrips
                    if ((data === null || data === void 0 ? void 0 : data.level) === 0) {
                        return true;
                    }
                    if (((_a = data === null || data === void 0 ? void 0 : data.preparation) === null || _a === void 0 ? void 0 : _a.mode) === 'always') {
                        return true;
                    }
                    return (_b = data === null || data === void 0 ? void 0 : data.preparation) === null || _b === void 0 ? void 0 : _b.prepared;
                });
                const reactions = preparedSpells.filter(({ data }) => {
                    var _a;
                    return ((_a = data === null || data === void 0 ? void 0 : data.activation) === null || _a === void 0 ? void 0 : _a.type) === 'reaction';
                });
                const damageDealers = preparedSpells.filter(({ data }) => {
                    var _a, _b;
                    //ASSUMPTION: If the spell causes damage, it will have damageParts
                    return ((_b = (_a = data === null || data === void 0 ? void 0 : data.damage) === null || _a === void 0 ? void 0 : _a.parts) === null || _b === void 0 ? void 0 : _b.length) > 0;
                });
                const includeOneMinutes = game.settings.get(MODULE_ID, MySettings.includeOneMinuteSpells);
                const oneMinuters = preparedSpells.filter(({ data }) => {
                    var _a, _b, _c, _d;
                    return ((((_a = data === null || data === void 0 ? void 0 : data.activation) === null || _a === void 0 ? void 0 : _a.type) === 'action' || ((_b = data === null || data === void 0 ? void 0 : data.activation) === null || _b === void 0 ? void 0 : _b.type) === 'bonus') &&
                        ((_c = data === null || data === void 0 ? void 0 : data.duration) === null || _c === void 0 ? void 0 : _c.units) === 'minute' &&
                        ((_d = data === null || data === void 0 ? void 0 : data.duration) === null || _d === void 0 ? void 0 : _d.value) === 1);
                });
                new Set([...damageDealers, ...reactions, ...(includeOneMinutes ? oneMinuters : [])]).forEach((spell) => {
                    var _a, _b, _c, _d, _e, _f;
                    const actionType = (_a = spell.data) === null || _a === void 0 ? void 0 : _a.actionType;
                    const actionTypeBonus = String(((_c = (_b = sheetData.data.bonuses) === null || _b === void 0 ? void 0 : _b[actionType]) === null || _c === void 0 ? void 0 : _c.attack) || 0);
                    const spellcastingMod = (_d = sheetData.data.abilities[sheetData.data.attributes.spellcasting]) === null || _d === void 0 ? void 0 : _d.mod;
                    const prof = sheetData.data.attributes.prof;
                    const toHitLabel = String(Number(actionTypeBonus) + spellcastingMod + prof);
                    const activationType = getActivationType((_f = (_e = spell.data) === null || _e === void 0 ? void 0 : _e.activation) === null || _f === void 0 ? void 0 : _f.type);
                    actionsData[activationType].add(Object.assign(Object.assign({}, spell), { labels: Object.assign(Object.assign({}, spell.labels), { toHit: toHitLabel }) }));
                });
            });
        }
        catch (e) {
            log(true, 'error trying to digest spellbook', e);
        }
        try {
            const activeFeatures = (sheetData === null || sheetData === void 0 ? void 0 : sheetData.features.find(({ label }) => label.includes('Active')).items) || [];
            // MUTATES actionsData
            activeFeatures.forEach((item) => {
                var _a, _b;
                const activationType = getActivationType((_b = (_a = item.data) === null || _a === void 0 ? void 0 : _a.activation) === null || _b === void 0 ? void 0 : _b.type);
                actionsData[activationType].add(item);
            });
        }
        catch (e) {
            log(true, 'error trying to digest features', e);
        }
        sheetData.actionsData = actionsData;
        // if description is populated and appearance isn't use description as appearance
        try {
            log(false, sheetData);
            if (!!((_b = sheetData.data.details.description) === null || _b === void 0 ? void 0 : _b.value) && !sheetData.data.details.appearance) {
                sheetData.data.details.appearance = (_c = sheetData.data.details.description) === null || _c === void 0 ? void 0 : _c.value;
            }
        }
        catch (e) {
            log(true, 'error trying to migrate description to appearance', e);
        }
        try {
            sheetData.settings = Object.assign(Object.assign({}, sheetData.settings), { [MODULE_ID]: {
                    passiveDisplay: {
                        prc: game.settings.get(MODULE_ID, MySettings.displayPassivePerception),
                        ins: game.settings.get(MODULE_ID, MySettings.displayPassiveInsight),
                        inv: game.settings.get(MODULE_ID, MySettings.displayPassiveInvestigation),
                        ste: game.settings.get(MODULE_ID, MySettings.displayPassiveStealth),
                    },
                } });
        }
        catch (e) {
            log(true, 'error trying to populate sheet settings', e);
        }
        return sheetData;
    }
}
/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    log(true, `Initializing ${MODULE_ID}`);
    // Assign custom classes and constants here
    // Register custom module settings
    registerSettings();
    // Preload Handlebars templates
    await preloadTemplates();
    // Register custom sheets (if any)
});
// Register compactBeyond5eSheet Sheet
Actors.registerSheet('dnd5e', CompactBeyond5eSheet, {
    label: 'Compact D&D Beyond-like',
    makeDefault: false,
    types: ['character'],
});
/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
    // Remove when 0.7.x is stable
    if (!isNewerVersion(game.data.version, '0.7.0')) {
        // register this sheet with BetterRolls
        //@ts-ignore
        if (window.BetterRolls) {
            //@ts-ignore
            window.BetterRolls.hooks.addActorSheet('CompactBeyond5eSheet');
        }
    }
});
// Add any additional hooks if necessary

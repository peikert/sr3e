<script lang="ts">
import { onDestroy, onMount, untrack } from "svelte";
import { localize } from "../../services/utilities";
import Image from "../common-components/Image.svelte";
import GadgetViewer from "../common-components/GadgetViewer.svelte";
import ItemSheetComponent from "../common-components/ItemSheetComponent.svelte";
import ItemSheetWrapper from "../common-components/ItemSheetWrapper.svelte";
import JournalViewer from "../common-components/JournalViewer.svelte";
import LabeledBoolean from "./LabeledBoolean.svelte";
import LabeledDropdown from "./LabeledDropdown.svelte";
import LabeledNumberInput from "./LabeledNumberInput.svelte";
import { gadgetTargetProperties } from "../../services/gadgets/gadgetTargets";

const p = $props<{ item: Item }>();
const item = untrack(() => p.item);
const system = item.system as Record<string, any>;

let name = $state(item.name as string);
let category = $state(system.category as string);
let durationType = $state(system.duration?.type as string);
let manipulationSubtype = $state(system.manipulationSubtype as string);
let targetingKind = $state(system.targeting?.kind as string);
let thresholdMode = $state(system.threshold?.mode as string);
let skillOptions = $state<{ value: string; label: string }[]>([]);

const effectTargetPathOptions = gadgetTargetProperties("medical").map(prop => ({ value: prop.value, label: prop.label }));

const isManipulation = $derived(category === "manipulation");
const isControlManipulation = $derived(isManipulation && manipulationSubtype === "control");
const isElementalManipulation = $derived(isManipulation && manipulationSubtype === "elemental");
const usesGenericTargeting = $derived(!isElementalManipulation);
const usesResistanceAttribute = $derived(usesGenericTargeting && (targetingKind === "attribute" || isControlManipulation));
const usesThreshold = $derived(isManipulation && !isElementalManipulation);

function kvOptions(map: Record<string, string>) {
    return Object.entries(map).map(([value, token]) => ({ value, label: localize(token) }));
}

function buildSkillOptions() {
    const parent = (item as any).parent;
    if (!parent) return;

    const result: { value: string; label: string }[] = [];
    const skills = (parent.items as any[]).filter((i: any) => i.type === "skill");

    for (const skill of skills) {
        const baseLabel = skill.name as string;
        result.push({ value: skill.id, label: baseLabel });

        const sys = skill.system as Record<string, any>;
        let specializations: { name: string }[] = [];

        switch (sys.skillType) {
            case "active":    specializations = sys.activeSkill?.specializations ?? [];    break;
            case "knowledge": specializations = sys.knowledgeSkill?.specializations ?? []; break;
            case "language":  specializations = sys.languageSkill?.specializations ?? [];  break;
        }

        specializations.forEach((spec, i) => {
            result.push({ value: `${skill.id}::${i}`, label: `${baseLabel} — ${spec.name}` });
        });
    }

    skillOptions = result;
}

function onCategoryChange(val: string) {
    category = val;
    (item as any).update({ "system.category": val }, { render: false });
}

function updateSystem(path: string, val: string | number | boolean) {
    (item as any).update({ [path]: val }, { render: false });
}

onMount(() => {
    buildSkillOptions();
    const collection = (item as any).parent?.items.collection;
    if (collection) {
        collection.on("update", buildSkillOptions);
        collection.on("create", buildSkillOptions);
        collection.on("delete", buildSkillOptions);
    }
});

onDestroy(() => {
    const collection = (item as any).parent?.items.collection;
    if (collection) {
        collection.off("update", buildSkillOptions);
        collection.off("create", buildSkillOptions);
        collection.off("delete", buildSkillOptions);
    }
});

function onManipulationSubtypeChange(val: string) {
    manipulationSubtype = val;
    const update: Record<string, string | number | boolean> = { "system.manipulationSubtype": val };

    if (val === "control") {
        thresholdMode = "halfAttribute";
        update["system.resistance.attribute"] = "willpower";
        update["system.threshold.mode"] = "halfAttribute";
        update["system.threshold.attribute"] = "willpower";
        update["system.threshold.divisor"] = 2;
    }

    if (val === "elemental") {
        update["system.elementalAttack.targetNumber"] = 4;
        update["system.elementalAttack.canDodge"] = true;
        update["system.elementalAttack.armorMultiplier"] = 0.5;
    }

    (item as any).update(update, { render: false });
}
</script>

<ItemSheetWrapper csslayout="triple-flow">
    <ItemSheetComponent>
        <Image entity={item} />
        <div class="large-input-wrapper">
            <div class="large-input-background"></div>
            <input
                class="large"
                name="name"
                type="text"
                value={name}
                onchange={(e) => item.update({ name: (e.target as HTMLInputElement).value })}
            />
        </div>
        <LabeledDropdown {item} key="type" label={localize(CONFIG.SR3E.SPELL.type)} value={system.type ?? ""} path="system" options={kvOptions(CONFIG.SR3E.SPELL_TYPES)} />
        <LabeledDropdown {item} key="category" label={localize(CONFIG.SR3E.SPELL.category)} value={category} path="system" options={kvOptions(CONFIG.SR3E.SPELL_CATEGORIES)} onUpdate={onCategoryChange} />
        <LabeledDropdown {item} key="manipulationSubtype" label={localize(CONFIG.SR3E.SPELL.manipulationSubtype)} value={manipulationSubtype ?? ""} options={kvOptions(CONFIG.SR3E.SPELL_MANIPULATION_SUBTYPES)} onUpdate={onManipulationSubtypeChange} disabled={!isManipulation} />
    </ItemSheetComponent>

    <ItemSheetComponent title={localize(CONFIG.SR3E.SPELL.casting)}>
        <LabeledNumberInput {item} key="learnedForce" label={localize(CONFIG.SR3E.SPELL.learnedForce)} value={system.learnedForce ?? 0} path="system" />
        {#if (item as any).parent}
            <LabeledDropdown {item} key="linkedSkillId" label={localize(CONFIG.SR3E.SPELL.linkedSkill)} value={system.linkedSkillId ?? ""} path="system" options={skillOptions} disabled={!skillOptions.length} />
        {/if}
        <LabeledDropdown {item} key="range" label={localize(CONFIG.SR3E.SPELL.range)} value={system.range ?? ""} path="system" options={kvOptions(CONFIG.SR3E.SPELL_RANGES)} />
        <LabeledDropdown {item} key="type" label={localize(CONFIG.SR3E.SPELL.duration)} value={durationType ?? ""} options={kvOptions(CONFIG.SR3E.SPELL_DURATIONS)} onUpdate={(val) => { durationType = val; updateSystem("system.duration.type", val); }} />
        <LabeledNumberInput {item} key="rounds" label={localize(CONFIG.SR3E.SPELL.rounds)} value={system.duration?.rounds ?? 0} path="system.duration" disabled={durationType !== "sustained"} />
        <LabeledBoolean {item} key="exclusive" label={localize(CONFIG.SR3E.SPELL.exclusiveCast)} value={Boolean(system.limits?.exclusive)} path="system.limits" />
    </ItemSheetComponent>

    <ItemSheetComponent title={localize(CONFIG.SR3E.SPELL.targetingRules)}>
        <LabeledDropdown {item} key="kind" label={localize(CONFIG.SR3E.SPELL.targeting)} value={targetingKind ?? ""} options={kvOptions(CONFIG.SR3E.SPELL_TARGETING)} onUpdate={(val) => { targetingKind = val; updateSystem("system.targeting.kind", val); }} disabled={!usesGenericTargeting} />
        <LabeledDropdown {item} key="attribute" label={localize(CONFIG.SR3E.SPELL.targetAttribute)} value={system.targeting?.attribute ?? ""} path="system.targeting" options={kvOptions(CONFIG.SR3E.ATTRIBUTES)} disabled={!usesGenericTargeting || targetingKind !== "attribute"} />
        <LabeledNumberInput {item} key="staticTargetNumber" label={localize(CONFIG.SR3E.SPELL.staticTargetNumber)} value={system.targeting?.staticTargetNumber ?? 0} path="system.targeting" disabled={!usesGenericTargeting || targetingKind !== "static"} />
        <LabeledDropdown {item} key="attribute" label={localize(CONFIG.SR3E.SPELL.resistanceAttribute)} value={system.resistance?.attribute ?? ""} path="system.resistance" options={kvOptions(CONFIG.SR3E.ATTRIBUTES)} disabled={!usesResistanceAttribute} />
        <LabeledNumberInput {item} key="targetNumber" label={localize(CONFIG.SR3E.SPELL.attackTargetNumber)} value={system.elementalAttack?.targetNumber ?? 4} path="system.elementalAttack" disabled={!isElementalManipulation} />
        <LabeledBoolean {item} key="canDodge" label={localize(CONFIG.SR3E.SPELL.canDodge)} value={Boolean(system.elementalAttack?.canDodge ?? true)} path="system.elementalAttack" disabled={!isElementalManipulation} />
        <LabeledNumberInput {item} key="armorMultiplier" label={localize(CONFIG.SR3E.SPELL.armorMultiplier)} value={system.elementalAttack?.armorMultiplier ?? 0.5} path="system.elementalAttack" disabled={!isElementalManipulation} />
    </ItemSheetComponent>

    <ItemSheetComponent title={localize(CONFIG.SR3E.SPELL.thresholdRules)}>
        <LabeledDropdown {item} key="mode" label={localize(CONFIG.SR3E.SPELL.thresholdMode)} value={thresholdMode ?? "none"} options={kvOptions(CONFIG.SR3E.SPELL_THRESHOLD_MODES)} onUpdate={(val) => { thresholdMode = val; updateSystem("system.threshold.mode", val); }} disabled={!usesThreshold} />
        <LabeledDropdown {item} key="attribute" label={localize(CONFIG.SR3E.SPELL.thresholdAttribute)} value={system.threshold?.attribute ?? "willpower"} path="system.threshold" options={kvOptions(CONFIG.SR3E.ATTRIBUTES)} disabled={!usesThreshold || thresholdMode !== "halfAttribute"} />
        <LabeledNumberInput {item} key="divisor" label={localize(CONFIG.SR3E.SPELL.thresholdDivisor)} value={system.threshold?.divisor ?? 2} path="system.threshold" disabled={!usesThreshold || thresholdMode !== "halfAttribute"} />
        <LabeledNumberInput {item} key="value" label={localize(CONFIG.SR3E.SPELL.thresholdValue)} value={system.threshold?.value ?? 0} path="system.threshold" disabled={!usesThreshold || thresholdMode !== "static"} />
    </ItemSheetComponent>

    <ItemSheetComponent title={`${localize(CONFIG.SR3E.SPELL.drain)} / ${localize(CONFIG.SR3E.SPELL.effectRules)}`}>
        <LabeledNumberInput {item} key="powerModifier" label={localize(CONFIG.SR3E.SPELL.drainPowerModifier)} value={system.drain?.powerModifier ?? 0} path="system.drain" />
        <LabeledDropdown {item} key="damageLevel" label={localize(CONFIG.SR3E.SPELL.drainDamageLevel)} value={system.drain?.damageLevel ?? ""} path="system.drain" options={kvOptions(CONFIG.SR3E.SPELL_DRAIN_LEVELS)} />
        <LabeledNumberInput {item} key="damageLevelModifier" label={localize(CONFIG.SR3E.SPELL.drainDamageLevelModifier)} value={system.drain?.damageLevelModifier ?? 0} path="system.drain" />
        <LabeledDropdown {item} key="algorithm" label={localize(CONFIG.SR3E.SPELL.effectAlgorithm)} value={system.effect?.algorithm ?? ""} path="system.effect" options={kvOptions(CONFIG.SR3E.SPELL_EFFECT_ALGORITHMS)} />
        <LabeledDropdown {item} key="targetPath" label={localize(CONFIG.SR3E.SPELL.effectTargetPath)} value={system.effect?.targetPath ?? ""} path="system.effect" options={effectTargetPathOptions} />
        <LabeledDropdown {item} key="scope" label={localize(CONFIG.SR3E.SPELL.effectScope)} value={system.effect?.scope ?? "caster"} path="system.effect" options={kvOptions(CONFIG.SR3E.SPELL_EFFECT_SCOPES)} />
    </ItemSheetComponent>

    <ItemSheetComponent title={localize(CONFIG.SR3E.SPELL.fetishes)}>
        <GadgetViewer document={item} isSlim={true} />
    </ItemSheetComponent>

    <JournalViewer document={item} />
</ItemSheetWrapper>

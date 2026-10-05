/** FOOD-001A: supplied draft facts and structural completeness, never sale authority. */
export type FoodProductId = string & { readonly __brand: "FoodProductId" };
export type FoodRecipeId = string & { readonly __brand: "FoodRecipeId" };
export const FOOD_IDENTIFIER_PREFIXES = Object.freeze({ product: "food-product", recipe: "food-recipe" });
export const FOOD_MAJOR_ALLERGENS = Object.freeze(["milk", "egg", "fish", "crustacean-shellfish", "tree-nuts", "peanuts", "wheat", "soybeans", "sesame"] as const);
export const FOOD_REVIEW_STATES = Object.freeze(["unknown", "pending", "reviewed"] as const);
export const FOOD_PROCESS_CLASSIFICATIONS = Object.freeze(["unknown", "unprocessed", "cooked", "baked", "dried", "pickled", "fermented", "acidified", "other"] as const);
export const FOOD_TEMPERATURE_CLASSIFICATIONS = Object.freeze(["unknown", "ambient", "refrigerated", "frozen"] as const);
export const FOOD_COTTAGE_CONCLUSIONS = Object.freeze(["eligible", "ineligible", "inconclusive"] as const);
export const FOOD_TAX_CONCLUSIONS = Object.freeze(["exempt", "taxable", "inconclusive"] as const);
export const FOOD_DRAFT_EVIDENCE_REQUIREMENTS = Object.freeze(["ingredient-composition-disclosure-status", "allergen-review", "preservation-process-classification", "temperature-control-classification", "cottage-eligibility-review", "sales-tax-review"] as const);
export type FoodEvidenceRequirement = typeof FOOD_DRAFT_EVIDENCE_REQUIREMENTS[number];
export type FoodMajorAllergen = typeof FOOD_MAJOR_ALLERGENS[number];
export const FOOD_EVIDENCE_SUBJECT_MAPPING = Object.freeze({
    "ingredient-composition-disclosure-status": "recipe", "allergen-review": "recipe", "preservation-process-classification": "recipe",
    "temperature-control-classification": "product", "cottage-eligibility-review": "product", "sales-tax-review": "product"
} as const);
export type FoodSubject = Readonly<{ type: "recipe"; id: FoodRecipeId; version: number } | { type: "product"; id: FoodProductId; version: number }>;
export interface FoodEvidence { readonly requirement: FoodEvidenceRequirement; readonly sourceReference: string; readonly subject: FoodSubject; readonly reviewDate: string; readonly reviewer?: string; readonly issuer?: string }
export type FoodIngredient = Readonly<{ kind: "simple"; name: string } | { kind: "purchased-component"; name: string; composition: "undisclosed" } | { kind: "purchased-component"; name: string; composition: "disclosed"; subingredients: readonly Readonly<{ name: string }>[] }>;
export interface FoodAllergenDeclaration { readonly allergen: FoodMajorAllergen; readonly detail?: string }
export type FoodAllergenReview = Readonly<{ state: "unknown" | "pending"; declarations: readonly FoodAllergenDeclaration[] } | { state: "reviewed"; declarations: readonly FoodAllergenDeclaration[] }>;
export type FoodReview<C extends string> = Readonly<{ state: "unknown" | "pending" } | { state: "reviewed"; conclusion: C }>;
export type FoodProcess = Readonly<{ classification: Exclude<typeof FOOD_PROCESS_CLASSIFICATIONS[number], "other"> } | { classification: "other"; description: string }>;
export interface FoodRecipeDraft {
    readonly id: FoodRecipeId; readonly version: number; readonly ingredients?: readonly FoodIngredient[];
    readonly allergenReview?: FoodAllergenReview; readonly process?: FoodProcess; readonly evidence: readonly FoodEvidence[];
}
export interface FoodProductDraft {
    readonly id: FoodProductId; readonly version: number; readonly recipe: Readonly<{ id: FoodRecipeId; version: number }>;
    readonly temperatureControl?: typeof FOOD_TEMPERATURE_CLASSIFICATIONS[number];
    readonly historicalLabelReference?: Readonly<{ id: string; version: number }>;
    readonly cottageReview?: FoodReview<typeof FOOD_COTTAGE_CONCLUSIONS[number]>;
    readonly salesTaxReview?: FoodReview<typeof FOOD_TAX_CONCLUSIONS[number]>;
    readonly evidence: readonly FoodEvidence[];
}
export interface FoodUnresolvedReview { readonly requirement: FoodEvidenceRequirement; readonly condition: "unknown" | "pending" | "undisclosed" | "inconclusive"; readonly ingredientIndex?: number }
export interface FoodDraftEvidenceCompleteness { readonly requiredEvidencePresent: boolean; readonly missingEvidenceRequirements: readonly FoodEvidenceRequirement[]; readonly unresolvedReviews: readonly FoodUnresolvedReview[] }
function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== "object" || Array.isArray(v)) throw new TypeError("Expected object"); return v as Record<string, unknown>; }
function keys(v: Record<string, unknown>, allowed: readonly string[]): void { if (Object.keys(v).some(k => !allowed.includes(k))) throw new TypeError("Unsupported field"); }
function text(v: unknown): string { if (typeof v !== "string" || !v.length || v.trim() !== v) throw new TypeError("Expected canonical text"); return v; }
export function validateFoodVersion(v: unknown): number { if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0) throw new TypeError("Expected positive safe version"); return v; }
function local(v: unknown): string { const s = text(v); if (s.includes(":")) throw new TypeError("Local identity contains colon"); return s; }
export function createFoodProductId(v: unknown): FoodProductId { return `food-product:${local(v)}` as FoodProductId; }
export function createFoodRecipeId(v: unknown): FoodRecipeId { return `food-recipe:${local(v)}` as FoodRecipeId; }
function parseId(v: unknown, prefix: string): string { const s = text(v); if (!s.startsWith(prefix + ":")) throw new TypeError("Wrong identity prefix"); local(s.slice(prefix.length + 1)); return s; }
export function parseFoodProductId(v: unknown): FoodProductId { return parseId(v, "food-product") as FoodProductId; }
export function parseFoodRecipeId(v: unknown): FoodRecipeId { return parseId(v, "food-recipe") as FoodRecipeId; }
function member<T extends string>(v: unknown, values: readonly T[]): T { if (typeof v !== "string" || !values.includes(v as T)) throw new TypeError("Unsupported enum"); return v as T; }
function array(v: unknown): unknown[] { if (!Array.isArray(v)) throw new TypeError("Expected array"); return Array.from(v); }
function freeze<T>(v: T): T { if (v && typeof v === "object") { for (const child of Object.values(v)) freeze(child); Object.freeze(v); } return v; }
export function validateFoodReviewDate(v: unknown): string {
    const s = text(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new TypeError("Expected YYYY-MM-DD");
    const [y, m, d] = s.split("-").map(Number); const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw new TypeError("Invalid calendar date"); return s;
}
function evidence(v: unknown, type: "recipe" | "product", id: string, version: number): FoodEvidence[] {
    const seen = new Set<string>();
    return array(v).map(item => {
        const r = record(item); keys(r, ["requirement", "sourceReference", "subject", "reviewDate", "reviewer", "issuer"]);
        const requirement = member(r.requirement, FOOD_DRAFT_EVIDENCE_REQUIREMENTS); const s = record(r.subject); keys(s, ["type", "id", "version"]);
        if (s.type !== type || FOOD_EVIDENCE_SUBJECT_MAPPING[requirement] !== type) throw new TypeError("Wrong evidence subject type");
        const subjectId = type === "recipe" ? parseFoodRecipeId(s.id) : parseFoodProductId(s.id);
        if (subjectId !== id || validateFoodVersion(s.version) !== version) throw new TypeError("Evidence subject/version mismatch");
        if (seen.has(requirement)) throw new TypeError("Duplicate evidence requirement"); seen.add(requirement);
        const reviewer = r.reviewer === undefined ? undefined : text(r.reviewer); const issuer = r.issuer === undefined ? undefined : text(r.issuer);
        if (reviewer === undefined && issuer === undefined) throw new TypeError("Evidence attribution required");
        return { requirement, sourceReference: text(r.sourceReference), subject: { type, id: subjectId, version } as FoodSubject, reviewDate: validateFoodReviewDate(r.reviewDate), ...(reviewer === undefined ? {} : { reviewer }), ...(issuer === undefined ? {} : { issuer }) };
    });
}
function requireEvidence(list: readonly FoodEvidence[], requirement: FoodEvidenceRequirement): void { if (!list.some(e => e.requirement === requirement)) throw new TypeError("Reviewed evidence required"); }
function ingredients(v: unknown): FoodIngredient[] { return array(v).map(item => {
    const r = record(item); const name = text(r.name);
    if (r.kind === "simple") { keys(r, ["kind", "name"]); return { kind: "simple", name }; }
    if (r.kind !== "purchased-component") throw new TypeError("Invalid ingredient kind");
    if (r.composition === "undisclosed") { keys(r, ["kind", "name", "composition"]); return { kind: "purchased-component", name, composition: "undisclosed" }; }
    if (r.composition !== "disclosed") throw new TypeError("Explicit composition required");
    keys(r, ["kind", "name", "composition", "subingredients"]);
    const subingredients = array(r.subingredients).map(sub => { const s = record(sub); keys(s, ["name"]); return { name: text(s.name) }; });
    if (!subingredients.length) throw new TypeError("Disclosed composition cannot be empty");
    return { kind: "purchased-component", name, composition: "disclosed", subingredients };
}); }
function allergens(v: unknown, list: readonly FoodEvidence[]): FoodAllergenReview {
    const r = record(v); keys(r, ["state", "declarations"]); const state = member(r.state, FOOD_REVIEW_STATES); const seen = new Set<string>();
    const declarations = array(r.declarations).map(item => { const d = record(item); keys(d, ["allergen", "detail"]); const allergen = member(d.allergen, FOOD_MAJOR_ALLERGENS);
        if (seen.has(allergen)) throw new TypeError("Duplicate allergen"); seen.add(allergen);
        if (d.detail !== undefined && !["fish", "crustacean-shellfish", "tree-nuts"].includes(allergen)) throw new TypeError("Detail category unsupported");
        return { allergen, ...(d.detail === undefined ? {} : { detail: text(d.detail) }) };
    });
    if (state === "reviewed") requireEvidence(list, "allergen-review"); return { state, declarations };
}
function review<C extends string>(v: unknown, conclusions: readonly C[], list: readonly FoodEvidence[], requirement: FoodEvidenceRequirement): FoodReview<C> {
    const r = record(v); const state = member(r.state, FOOD_REVIEW_STATES);
    if (state !== "reviewed") { keys(r, ["state"]); return { state }; }
    keys(r, ["state", "conclusion"]); requireEvidence(list, requirement); return { state, conclusion: member(r.conclusion, conclusions) };
}
export function validateFoodRecipeDraft(v: unknown): FoodRecipeDraft {
    const r = record(v); keys(r, ["id", "version", "ingredients", "allergenReview", "process", "evidence"]);
    const id = parseFoodRecipeId(r.id); const version = validateFoodVersion(r.version); const list = evidence(r.evidence, "recipe", id, version);
    let process: FoodProcess | undefined;
    if (r.process !== undefined) { const p = record(r.process); const classification = member(p.classification, FOOD_PROCESS_CLASSIFICATIONS);
        if (classification === "other") { keys(p, ["classification", "description"]); process = { classification, description: text(p.description) }; }
        else { keys(p, ["classification"]); process = { classification }; }
    }
    return freeze({ id, version, evidence: list, ...(r.ingredients === undefined ? {} : { ingredients: ingredients(r.ingredients) }), ...(r.allergenReview === undefined ? {} : { allergenReview: allergens(r.allergenReview, list) }), ...(process === undefined ? {} : { process }) });
}
export function validateFoodProductDraft(v: unknown, recipeInput: unknown): FoodProductDraft {
    const recipe = validateFoodRecipeDraft(recipeInput); const r = record(v); keys(r, ["id", "version", "recipe", "temperatureControl", "cottageReview", "salesTaxReview", "evidence", "historicalLabelReference"]);
    const id = parseFoodProductId(r.id); const version = validateFoodVersion(r.version); const reference = record(r.recipe); keys(reference, ["id", "version"]);
    if (parseFoodRecipeId(reference.id) !== recipe.id || validateFoodVersion(reference.version) !== recipe.version) throw new TypeError("Recipe reference mismatch");
    const list = evidence(r.evidence, "product", id, version);
    let historicalLabelReference: Readonly<{ id: string; version: number }> | undefined;
    if (r.historicalLabelReference !== undefined) { const label = record(r.historicalLabelReference); keys(label, ["id", "version"]); historicalLabelReference = { id: text(label.id), version: validateFoodVersion(label.version) }; }
    return freeze({ id, version, recipe: { id: recipe.id, version: recipe.version }, evidence: list, ...(historicalLabelReference === undefined ? {} : { historicalLabelReference }),
        ...(r.temperatureControl === undefined ? {} : { temperatureControl: member(r.temperatureControl, FOOD_TEMPERATURE_CLASSIFICATIONS) }),
        ...(r.cottageReview === undefined ? {} : { cottageReview: review(r.cottageReview, FOOD_COTTAGE_CONCLUSIONS, list, "cottage-eligibility-review") }),
        ...(r.salesTaxReview === undefined ? {} : { salesTaxReview: review(r.salesTaxReview, FOOD_TAX_CONCLUSIONS, list, "sales-tax-review") }) });
}
function consecutive(previous: number, next: number): void { if (previous === Number.MAX_SAFE_INTEGER || next !== previous + 1) throw new TypeError("Revision must be consecutive"); }
/** Full replacement input is mandatory: no completed reviews or evidence are carried forward. */
export function reviseFoodRecipeDraft(previousInput: unknown, nextInput: unknown): FoodRecipeDraft {
    const previous = validateFoodRecipeDraft(previousInput); const next = validateFoodRecipeDraft(nextInput);
    if (previous.id !== next.id) throw new TypeError("Recipe identity drift"); consecutive(previous.version, next.version); return next;
}
export function reviseFoodProductDraft(previousInput: unknown, previousRecipe: unknown, nextInput: unknown, nextRecipe: unknown): FoodProductDraft {
    const previous = validateFoodProductDraft(previousInput, previousRecipe); const next = validateFoodProductDraft(nextInput, nextRecipe);
    if (previous.id !== next.id) throw new TypeError("Product identity drift"); consecutive(previous.version, next.version); return next;
}
export function assessFoodDraftEvidenceCompleteness(productInput: unknown, recipeInput: unknown): FoodDraftEvidenceCompleteness {
    const recipe = validateFoodRecipeDraft(recipeInput); const product = validateFoodProductDraft(productInput, recipe);
    const missing: FoodEvidenceRequirement[] = []; const unresolved: FoodUnresolvedReview[] = [];
    const add = (requirement: FoodEvidenceRequirement, condition: FoodUnresolvedReview["condition"], ingredientIndex?: number) => unresolved.push({ requirement, condition, ...(ingredientIndex === undefined ? {} : { ingredientIndex }) });
    if (recipe.ingredients === undefined) missing.push("ingredient-composition-disclosure-status");
    else recipe.ingredients.forEach((i, index) => { if (i.kind === "purchased-component" && i.composition === "undisclosed") add("ingredient-composition-disclosure-status", "undisclosed", index); });
    if (recipe.allergenReview === undefined) missing.push("allergen-review"); else if (recipe.allergenReview.state !== "reviewed") add("allergen-review", recipe.allergenReview.state);
    if (recipe.process === undefined) missing.push("preservation-process-classification"); else if (recipe.process.classification === "unknown") add("preservation-process-classification", "unknown");
    if (product.temperatureControl === undefined) missing.push("temperature-control-classification"); else if (product.temperatureControl === "unknown") add("temperature-control-classification", "unknown");
    for (const [requirement, value] of [["cottage-eligibility-review", product.cottageReview], ["sales-tax-review", product.salesTaxReview]] as const) {
        if (value === undefined) missing.push(requirement); else if (value.state !== "reviewed") add(requirement, value.state); else if (value.conclusion === "inconclusive") add(requirement, "inconclusive");
    }
    return freeze({ requiredEvidencePresent: missing.length === 0, missingEvidenceRequirements: missing, unresolvedReviews: unresolved });
}

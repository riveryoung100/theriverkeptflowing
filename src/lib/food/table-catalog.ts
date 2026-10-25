/** Static Table presentation adapter over the existing food domain. No sale authority. */
import { validateFoodProductDraft, validateFoodRecipeDraft, type FoodProductDraft, type FoodRecipeDraft } from './draft-domain';
import { validateFoodDishPresentation, validateFoodServingOffer, type FoodDishPresentation, type FoodServingOffer } from './dish-offer-domain';
import { validateFoodSkuVersion, validateFoodPackageDefinitionVersion, type FoodSkuVersion, type FoodPackageDefinitionVersion } from './package-sku-domain';
import { validateFoodApprovedCommercialPriceVersion, type FoodApprovedCommercialPriceVersion } from './approved-commercial-price-domain';
import type { FoodMoney } from './cost-pricing-domain';

export const TABLE_STATES = ['DRAFT', 'IN_DEVELOPMENT', 'READY_FOR_REVIEW', 'APPROVED_FOR_DISPLAY', 'AVAILABLE', 'PAUSED', 'SOLD_OUT', 'DISCONTINUED'] as const;
export type TableState = typeof TABLE_STATES[number];
export type TableImage = Readonly<{ kind: 'concept-placeholder'; caption: string }> | Readonly<{ kind: 'owned-photo'; src: string; alt: string; caption: string; width: number; height: number }>;
export interface TableCatalogEntry {
  readonly recipe: FoodRecipeDraft;
  readonly product: FoodProductDraft;
  readonly presentation: FoodDishPresentation;
  readonly offer: FoodServingOffer;
  readonly slug: string;
  readonly category: string;
  readonly state: TableState;
  readonly display: 'hidden' | 'concept-preview' | 'approved';
  readonly ordering: 'not-accepting' | 'eligible-for-review';
  readonly availability: 'in-development' | 'unavailable' | 'available' | 'temporarily-paused' | 'sold-out';
  readonly ingredientsStatus: 'proposed' | 'verified';
  readonly image: TableImage;
  readonly finishingComponents: readonly Readonly<{ name: string; description: string; optional: boolean }>[];
  readonly nutrition: null | Readonly<{ evidenceReference: string; serving: string; facts: readonly Readonly<{ label: string; value: string }>[] }>;
  readonly sku: FoodSkuVersion | null;
  readonly packageDefinition: FoodPackageDefinitionVersion | null;
  readonly approvedPrice: FoodApprovedCommercialPriceVersion | null;
  readonly maxPerOrder: number | null;
  readonly remainingCapacity: number | null;
  readonly fulfillment: Readonly<{ pickup: boolean | null; localDelivery: boolean | null }>;
}
export function strictObject(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Reflect.ownKeys(input).some(k => typeof k !== 'string' || !allowed.includes(k))) throw new TypeError('Invalid Table record or unsupported field');
  return input as Record<string, unknown>;
}
export function canonicalText(input: unknown): string {
  if (typeof input !== 'string' || !input.length || input.trim() !== input || input.length > 4000) throw new TypeError('Expected canonical Table text');
  return input;
}
function member<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new TypeError('Invalid Table state');
  return value as T;
}
function limit(input: unknown, allowZero = false): number | null {
  if (input === null) return null;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < (allowZero ? 0 : 1)) throw new TypeError('Invalid Table limit');
  return input;
}
function nullableBoolean(v: unknown): boolean | null { if (v === null || typeof v === 'boolean') return v; throw new TypeError('Expected boolean or explicit null'); }
function freeze<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function validateImage(input: unknown): TableImage {
  const r = strictObject(input, ['kind', 'caption', 'src', 'alt', 'width', 'height']);
  const caption = canonicalText(r.caption);
  if (r.kind === 'concept-placeholder') { strictObject(input, ['kind', 'caption']); return {kind: r.kind, caption}; }
  if (r.kind !== 'owned-photo') throw new TypeError('Unsupported image kind');
  const src = canonicalText(r.src);
  // Local owned assets only; forbid traversal, protocols, queries and markup.
  if (!/^\/[a-zA-Z0-9/_-]+\.(avif|webp|png|jpe?g)$/.test(src) || src.startsWith('//') || src.includes('/../')) throw new TypeError('Expected local product photograph');
  const width = limit(r.width), height = limit(r.height);
  if (width === null || height === null) throw new TypeError('Photo dimensions are required');
  return {kind: r.kind, src, alt: canonicalText(r.alt), caption, width, height};
}
export function validateTableEntry(input: unknown): TableCatalogEntry {
  const r = strictObject(input, ['recipe', 'product', 'presentation', 'offer', 'slug', 'category', 'state', 'display', 'ordering', 'availability', 'ingredientsStatus', 'image', 'finishingComponents', 'nutrition', 'sku', 'packageDefinition', 'approvedPrice', 'maxPerOrder', 'remainingCapacity', 'fulfillment']);
  const recipe = validateFoodRecipeDraft(r.recipe);
  const product = validateFoodProductDraft(r.product, recipe);
  const presentation = validateFoodDishPresentation(r.presentation, product, recipe);
  const offer = validateFoodServingOffer(r.offer, presentation, product, recipe);
  const slug = canonicalText(r.slug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'index') throw new TypeError('Invalid Table slug');
  const state = member(r.state, TABLE_STATES);
  const expectedAvailability: Partial<Record<TableState, string>> = {IN_DEVELOPMENT: 'in-development', AVAILABLE: 'available', PAUSED: 'temporarily-paused', SOLD_OUT: 'sold-out'};
  if (expectedAvailability[state] && r.availability !== expectedAvailability[state]) throw new TypeError('Lifecycle and availability disagree');
  const display = member(r.display, ['hidden', 'concept-preview', 'approved']);
  const ingredientsStatus = member(r.ingredientsStatus, ['proposed', 'verified']);
  if ((state === 'DRAFT' || state === 'DISCONTINUED') && display !== 'hidden') throw new TypeError('Draft/retired products must be hidden');
  if (display === 'approved' && (ingredientsStatus !== 'verified' || !recipe.ingredients?.length || recipe.allergenReview?.state !== 'reviewed')) throw new TypeError('Approved display requires verified ingredients and allergen review');
  if (ingredientsStatus === 'verified' && (!recipe.ingredients?.length || recipe.ingredients.some(i => i.kind === 'purchased-component' && i.composition === 'undisclosed') || !recipe.evidence.some(e => e.requirement === 'ingredient-composition-disclosure-status'))) throw new TypeError('Verified ingredients require complete composition and evidence');
  if (state === 'AVAILABLE' && display !== 'approved') throw new TypeError('Availability cannot replace display approval');
  if (!Array.isArray(r.finishingComponents)) throw new TypeError('Expected finishing components');
  const finishingComponents = r.finishingComponents.map(raw => { const c = strictObject(raw, ['name', 'description', 'optional']); if (typeof c.optional !== 'boolean') throw new TypeError('Explicit component optionality required'); return { name: canonicalText(c.name), description: canonicalText(c.description), optional: c.optional }; });
  let nutrition: TableCatalogEntry['nutrition'] = null;
  if (r.nutrition !== null) {
    const n = strictObject(r.nutrition, ['evidenceReference', 'serving', 'facts']);
    if (display !== 'approved' || !Array.isArray(n.facts) || !n.facts.length) throw new TypeError('Nutrition requires substantiation and approved display');
    nutrition = { evidenceReference: canonicalText(n.evidenceReference), serving: canonicalText(n.serving), facts: n.facts.map(raw => { const f = strictObject(raw, ['label', 'value']); return {label: canonicalText(f.label), value: canonicalText(f.value)}; }) };
  }
  const sku = r.sku === null ? null : validateFoodSkuVersion(r.sku);
  const packageDefinition = r.packageDefinition === null ? null : validateFoodPackageDefinitionVersion(r.packageDefinition);
  if (sku && packageDefinition && (sku.package.id !== packageDefinition.id || sku.package.version !== packageDefinition.version)) throw new TypeError('SKU package mismatch');
  if (sku && (sku.servingOffer.offerId !== offer.offerId || sku.servingOffer.version !== offer.version)) throw new TypeError('SKU serving offer mismatch');
  if (r.approvedPrice !== null && !sku) throw new TypeError('Price requires exact SKU');
  const approvedPrice = r.approvedPrice === null ? null : validateFoodApprovedCommercialPriceVersion(r.approvedPrice, sku);
  if (approvedPrice && approvedPrice.money.currency !== 'USD') throw new TypeError('The Table currently supports USD cents only');
  const f = strictObject(r.fulfillment, ['pickup', 'localDelivery']);
  return freeze({recipe, product, presentation, offer, slug, category: canonicalText(r.category), state, display,
    ordering: member(r.ordering, ['not-accepting', 'eligible-for-review']),
    availability: member(r.availability, ['in-development', 'unavailable', 'available', 'temporarily-paused', 'sold-out']),
    ingredientsStatus, image: validateImage(r.image), finishingComponents, nutrition, sku, packageDefinition, approvedPrice,
    maxPerOrder: limit(r.maxPerOrder), remainingCapacity: limit(r.remainingCapacity, true),
    fulfillment: {pickup: nullableBoolean(f.pickup), localDelivery: nullableBoolean(f.localDelivery)} });
}
export function validateTableCatalog(input: unknown): readonly TableCatalogEntry[] {
  if (!Array.isArray(input)) throw new TypeError('Expected Table catalog');
  const entries = input.map(validateTableEntry), slugs = new Set(), ids = new Set();
  for (const e of entries) { if (slugs.has(e.slug) || ids.has(e.product.id)) throw new TypeError('Duplicate Table slug or product'); slugs.add(e.slug); ids.add(e.product.id); }
  return Object.freeze(entries);
}
export const tableProductPath = (slug: string) => `/the-table/${slug}/`;

/** Explicit whitelist: no evidence, owner costs, raw recipe formulations or live endpoints. */
export function publicTableProduct(input: unknown) {
  const e = validateTableEntry(input);
  if (e.display === 'hidden') return null;
  return freeze({ id: e.product.id, version: e.product.version, slug: e.slug, path: tableProductPath(e.slug), name: e.presentation.name,
    shortDescription: e.presentation.shortDescription ?? '', description: e.presentation.longDescription ?? '', category: e.category,
    state: e.state, concept: e.display === 'concept-preview', availability: e.availability, ordering: e.ordering,
    image: e.image, ingredientsStatus: e.ingredientsStatus, ingredients: (e.recipe.ingredients ?? []).map(i => i.kind === 'purchased-component' && i.composition === 'disclosed' ? `${i.name} (${i.subingredients.map(s => s.name).join(', ')})` : i.name),
    allergens: e.recipe.allergenReview?.state === 'reviewed' ? e.recipe.allergenReview.declarations.map(d => d.detail ? `${d.allergen}: ${d.detail}` : d.allergen) : null,
    serving: e.offer.servingEstimate, netGrams: e.packageDefinition?.netQuantity?.grams ?? null, storage: e.offer.storageSummary ?? {state: 'unknown' as const}, reheating: e.offer.reheatingSummary ?? {state: 'unknown' as const},
    finishingComponents: e.finishingComponents,
    nutrition: e.nutrition ? {serving: e.nutrition.serving, facts: e.nutrition.facts} : null,
    price: e.approvedPrice?.money ?? null as FoodMoney | null, maxPerOrder: e.maxPerOrder, fulfillment: e.fulfillment });
}
export type PublicTableProduct = NonNullable<ReturnType<typeof publicTableProduct>>;

// Local conceptual publication only. Future approved data must come from the food menu/SKU authorities.
export const TABLE_CATALOG = validateTableCatalog([{
  recipe: {id: 'food-recipe:southwest-harvest-bowl', version: 1, ingredients: [
    {kind: 'simple', name: 'Roasted sweet potatoes'}, {kind: 'simple', name: 'Black beans'}, {kind: 'simple', name: 'Rice'}, {kind: 'simple', name: 'Roasted peppers and onions'},
    {kind: 'simple', name: 'Mushrooms and greens — under consideration'}, {kind: 'simple', name: 'Cilantro-lime finishing sauce'}, {kind: 'simple', name: 'Pepita topping'}
  ], allergenReview: {state: 'pending', declarations: []}, evidence: []},
  product: {id: 'food-product:southwest-harvest-bowl', version: 1, recipe: {id: 'food-recipe:southwest-harvest-bowl', version: 1}, evidence: []},
  presentation: {dishId: 'food-dish:southwest-harvest-bowl', version: 1, product: {id: 'food-product:southwest-harvest-bowl', version: 1}, recipe: {id: 'food-recipe:southwest-harvest-bowl', version: 1}, name: 'Southwest Harvest Bowl', shortDescription: 'Roasted sweetness, hearty grains, and a bright finishing touch.', longDescription: 'Our first bowl begins with roasted sweet potato, black beans, rice, peppers, and onions. We’re exploring mushrooms and greens, a separate cilantro-lime finishing sauce, and a dry pepita topping for a meal designed around the reheated experience. Every detail is still being tested.'},
  offer: {offerId: 'food-serving-offer:southwest-harvest-bowl', version: 1, presentation: {dishId: 'food-dish:southwest-harvest-bowl', version: 1}, format: {kind: 'individual'}, servingEstimate: {state: 'unknown'}, storageSummary: {state: 'unknown'}, reheatingSummary: {state: 'unknown'}},
  slug: 'southwest-harvest-bowl', category: 'Bowls', state: 'IN_DEVELOPMENT', display: 'concept-preview', ordering: 'not-accepting', availability: 'in-development', ingredientsStatus: 'proposed',
  image: {kind: 'concept-placeholder', caption: 'Concept preview. Actual meal photography to come.'},
  finishingComponents: [{name: 'Cilantro-lime finish', description: 'A proposed separate sauce to add after heating.', optional: false}, {name: 'Pepita crunch', description: 'A proposed dry topping, kept separate until serving.', optional: false}],
  nutrition: null, sku: null, packageDefinition: null, approvedPrice: null, maxPerOrder: null, remainingCapacity: null, fulfillment: {pickup: null, localDelivery: null}
}]);
export const TABLE_PRODUCTS = Object.freeze(TABLE_CATALOG.map(publicTableProduct).filter((p): p is PublicTableProduct => p !== null));
export const TABLE_CATEGORIES = Object.freeze([...new Set(TABLE_PRODUCTS.map(p => p.category))]);

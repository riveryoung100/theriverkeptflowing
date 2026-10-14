/** FOOD-005X: asserted physical corrections against exact batch and SKU references.
 * Structure alone proves neither source authentication nor sufficient physical stock.
 */
import { parseFoodProductionBatchId, type FoodProductionBatchId } from "./production-batch-domain";
import { parseFoodSkuId, type FoodSkuId } from "./package-sku-domain";

export const FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND = "food-physical-inventory-movement" as const;
export type FoodPhysicalInventoryMovementId = string & {
  readonly __brand: "FoodPhysicalInventoryMovementId";
};
export type FoodPhysicalInventoryMovementType = "adjustment-in" | "adjustment-out" | "waste";
export interface FoodPhysicalInventoryMovement {
  readonly kind: typeof FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND;
  readonly id: FoodPhysicalInventoryMovementId;
  readonly batch: Readonly<{ id: FoodProductionBatchId; version: number }>;
  readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
  readonly movementType: FoodPhysicalInventoryMovementType;
  readonly packageCount: number;
  readonly occurredOn: string;
  readonly attribution: string;
  readonly sourceReference: string;
}

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Expected movement record");
  }
  const own = Reflect.ownKeys(input);
  if (own.length !== keys.length || own.some(key => typeof key !== "string" || !keys.includes(key))) {
    throw new TypeError("Invalid movement fields");
  }
  return input as Record<string, unknown>;
}

function text(input: unknown, maximum: number): string {
  if (typeof input !== "string" || !input.length || input.length > maximum || input.trim() !== input) {
    throw new TypeError("Expected bounded unpadded text");
  }
  return input;
}

function positive(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1) {
    throw new TypeError("Expected positive safe integer");
  }
  return input;
}

function calendarDate(input: unknown): string {
  const value = text(input, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Expected YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new TypeError("Invalid calendar date");
  }
  return value;
}

export function createFoodPhysicalInventoryMovementId(input: unknown): FoodPhysicalInventoryMovementId {
  const local = text(input, 128);
  if (local.includes(":")) throw new TypeError("Local identity cannot contain colon");
  return `food-physical-inventory-movement:${local}` as FoodPhysicalInventoryMovementId;
}

export function parseFoodPhysicalInventoryMovementId(input: unknown): FoodPhysicalInventoryMovementId {
  const prefix = "food-physical-inventory-movement:";
  const value = text(input, prefix.length + 128);
  if (!value.startsWith(prefix)) throw new TypeError("Wrong movement identity prefix");
  return createFoodPhysicalInventoryMovementId(value.slice(prefix.length));
}

export function validateFoodPhysicalInventoryMovement(input: unknown): FoodPhysicalInventoryMovement {
  const value = record(input, ["kind", "id", "batch", "sku", "movementType", "packageCount", "occurredOn", "attribution", "sourceReference"]);
  if (value.kind !== FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND) throw new TypeError("Invalid movement kind");
  const batch = record(value.batch, ["id", "version"]);
  const sku = record(value.sku, ["id", "version"]);
  const movementType = value.movementType;
  if (movementType !== "adjustment-in" && movementType !== "adjustment-out" && movementType !== "waste") {
    throw new TypeError("Invalid movement type");
  }
  return Object.freeze({
    kind: FOOD_PHYSICAL_INVENTORY_MOVEMENT_KIND,
    id: parseFoodPhysicalInventoryMovementId(value.id),
    batch: Object.freeze({ id: parseFoodProductionBatchId(batch.id), version: positive(batch.version) }),
    sku: Object.freeze({ id: parseFoodSkuId(sku.id), version: positive(sku.version) }),
    movementType,
    packageCount: positive(value.packageCount),
    occurredOn: calendarDate(value.occurredOn),
    attribution: text(value.attribution, 512),
    sourceReference: text(value.sourceReference, 512),
  });
}

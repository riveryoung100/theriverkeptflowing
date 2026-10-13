/** FOOD-005C: cart intent and immutable merchandise quote truth, never sale readiness. */
import { validateFoodVersion } from "./draft-domain";
import { validateFoodMoney, type FoodMoney } from "./cost-pricing-domain";
import {
    parseFoodSkuId,
    validateFoodSkuVersion,
    type FoodSkuId,
    type FoodSkuVersion,
} from "./package-sku-domain";
import {
    parseFoodApprovedCommercialPriceId,
    validateFoodApprovedCommercialPriceVersion,
    type FoodApprovedCommercialPriceId,
    type FoodApprovedCommercialPriceVersion,
} from "./approved-commercial-price-domain";

export type FoodCartId = string & { readonly __brand: "FoodCartId" };
export type FoodMerchandiseQuoteId =
    string & { readonly __brand: "FoodMerchandiseQuoteId" };

export interface FoodCartLine {
    readonly sku: Readonly<{
        id: FoodSkuId;
        version: number;
    }>;
    readonly quantity: number;
}

export interface FoodCartVersion {
    readonly id: FoodCartId;
    readonly version: number;
    readonly lines: readonly FoodCartLine[];
}

export interface FoodMerchandiseQuoteLine {
    readonly sku: Readonly<{
        id: FoodSkuId;
        version: number;
    }>;
    readonly approvedPrice: Readonly<{
        id: FoodApprovedCommercialPriceId;
        version: number;
    }>;
    readonly quantity: number;
    readonly unitPrice: FoodMoney;
    readonly merchandiseSubtotal: FoodMoney;
}

export interface FoodMerchandiseQuoteVersion {
    readonly id: FoodMerchandiseQuoteId;
    readonly version: number;
    readonly cart: Readonly<{
        id: FoodCartId;
        version: number;
    }>;
    readonly lines: readonly FoodMerchandiseQuoteLine[];
    readonly merchandiseSubtotal: FoodMoney;
}

const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER);

function record(
    value: unknown,
    allowed: readonly string[],
    message: string,
): Record<string, unknown> {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Reflect.ownKeys(value).some(
            key =>
                typeof key !== "string" ||
                !allowed.includes(key),
        )
    ) {
        throw new TypeError(message);
    }

    return value as Record<string, unknown>;
}

function list(value: unknown, message: string): readonly unknown[] {
    if (!Array.isArray(value)) {
        throw new TypeError(message);
    }

    return value;
}

function boundedText(value: unknown, maximum: number): string {
    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value ||
        value.length > maximum
    ) {
        throw new TypeError("Invalid bounded FOOD-005C text");
    }

    return value;
}

function localIdentity(value: unknown): string {
    const text = boundedText(value, 128);

    if (text.includes(":")) {
        throw new TypeError("Expected local FOOD-005C identity");
    }

    return text;
}

export function createFoodCartId(value: unknown): FoodCartId {
    return `food-cart:${localIdentity(value)}` as FoodCartId;
}

export function parseFoodCartId(value: unknown): FoodCartId {
    const prefix = "food-cart:";
    const text = boundedText(value, prefix.length + 128);

    if (!text.startsWith(prefix)) {
        throw new TypeError("Wrong food cart identity prefix");
    }

    return createFoodCartId(text.slice(prefix.length));
}

export function createFoodMerchandiseQuoteId(
    value: unknown,
): FoodMerchandiseQuoteId {
    return `food-merchandise-quote:${localIdentity(value)}` as FoodMerchandiseQuoteId;
}

export function parseFoodMerchandiseQuoteId(
    value: unknown,
): FoodMerchandiseQuoteId {
    const prefix = "food-merchandise-quote:";
    const text = boundedText(value, prefix.length + 128);

    if (!text.startsWith(prefix)) {
        throw new TypeError("Wrong merchandise quote identity prefix");
    }

    return createFoodMerchandiseQuoteId(text.slice(prefix.length));
}

export function validateFoodPurchaseQuantity(value: unknown): number {
    if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value <= 0
    ) {
        throw new TypeError(
            "Food purchase quantity must be a positive safe integer",
        );
    }

    return value;
}

function skuKey(id: FoodSkuId, version: number): string {
    return `${id}@${version}`;
}

function copyMoney(value: unknown): FoodMoney {
    const validated = validateFoodMoney(value);

    return Object.freeze({
        currency: validated.currency,
        minorUnits: validated.minorUnits,
    });
}

function sameMoney(left: FoodMoney, right: FoodMoney): boolean {
    return (
        left.currency === right.currency &&
        left.minorUnits === right.minorUnits
    );
}

function multiplyMoney(
    unitPrice: FoodMoney,
    quantity: number,
): FoodMoney {
    const minorUnits =
        BigInt(unitPrice.minorUnits) *
        BigInt(validateFoodPurchaseQuantity(quantity));

    if (minorUnits > MAX_SAFE_MINOR_UNITS) {
        throw new TypeError("Food merchandise line subtotal exceeds safe integer");
    }

    return copyMoney({
        currency: unitPrice.currency,
        minorUnits: Number(minorUnits),
    });
}

function addSafeMinorUnits(
    total: bigint,
    next: FoodMoney,
): bigint {
    const result = total + BigInt(next.minorUnits);

    if (result > MAX_SAFE_MINOR_UNITS) {
        throw new TypeError("Food merchandise subtotal exceeds safe integer");
    }

    return result;
}

export function validateFoodCartVersion(
    input: unknown,
): FoodCartVersion {
    const value = record(
        input,
        ["id", "version", "lines"],
        "Invalid food cart record",
    );

    const seen = new Set<string>();

    const lines = list(
        value.lines,
        "Food cart lines must be an array",
    ).map(rawLine => {
        const line = record(
            rawLine,
            ["sku", "quantity"],
            "Invalid food cart line",
        );

        const sku = record(
            line.sku,
            ["id", "version"],
            "Invalid food cart SKU reference",
        );

        const id = parseFoodSkuId(sku.id);
        const version = validateFoodVersion(sku.version);
        const quantity = validateFoodPurchaseQuantity(line.quantity);
        const key = skuKey(id, version);

        if (seen.has(key)) {
            throw new TypeError("Duplicate exact SKU cart line");
        }

        seen.add(key);

        return Object.freeze({
            sku: Object.freeze({
                id,
                version,
            }),
            quantity,
        });
    });

    return Object.freeze({
        id: parseFoodCartId(value.id),
        version: validateFoodVersion(value.version),
        lines: Object.freeze(lines),
    });
}

export function createInitialFoodCartVersion(
    input: unknown,
): FoodCartVersion {
    const value = validateFoodCartVersion(input);

    if (value.version !== 1) {
        throw new TypeError("Initial food cart version must be one");
    }

    return value;
}

export function reviseFoodCartVersion(
    previousInput: unknown,
    nextInput: unknown,
): FoodCartVersion {
    const previous = validateFoodCartVersion(previousInput);
    const next = validateFoodCartVersion(nextInput);

    if (previous.id !== next.id) {
        throw new TypeError("Food cart identity drift");
    }

    if (
        previous.version === Number.MAX_SAFE_INTEGER ||
        next.version !== previous.version + 1
    ) {
        throw new TypeError("Food cart revision must be consecutive");
    }

    return next;
}

function validateStructuralQuoteLine(
    input: unknown,
): FoodMerchandiseQuoteLine {
    const line = record(
        input,
        [
            "sku",
            "approvedPrice",
            "quantity",
            "unitPrice",
            "merchandiseSubtotal",
        ],
        "Invalid merchandise quote line",
    );

    const sku = record(
        line.sku,
        ["id", "version"],
        "Invalid quote SKU reference",
    );

    const approvedPrice = record(
        line.approvedPrice,
        ["id", "version"],
        "Invalid quote approved-price reference",
    );

    const quantity = validateFoodPurchaseQuantity(line.quantity);
    const unitPrice = copyMoney(line.unitPrice);
    const merchandiseSubtotal = copyMoney(line.merchandiseSubtotal);
    const expectedSubtotal = multiplyMoney(unitPrice, quantity);

    if (!sameMoney(expectedSubtotal, merchandiseSubtotal)) {
        throw new TypeError("Injected merchandise line subtotal");
    }

    return Object.freeze({
        sku: Object.freeze({
            id: parseFoodSkuId(sku.id),
            version: validateFoodVersion(sku.version),
        }),
        approvedPrice: Object.freeze({
            id: parseFoodApprovedCommercialPriceId(approvedPrice.id),
            version: validateFoodVersion(approvedPrice.version),
        }),
        quantity,
        unitPrice,
        merchandiseSubtotal,
    });
}

/**
 * Structural historical validation only.
 *
 * Exact source authorization is established when a quote is constructed
 * from supplied canonical SKU and FOOD-005B price snapshots.
 */
export function validateFoodMerchandiseQuoteVersion(
    input: unknown,
): FoodMerchandiseQuoteVersion {
    const value = record(
        input,
        ["id", "version", "cart", "lines", "merchandiseSubtotal"],
        "Invalid merchandise quote record",
    );

    const cart = record(
        value.cart,
        ["id", "version"],
        "Invalid merchandise quote cart reference",
    );

    const rawLines = list(
        value.lines,
        "Merchandise quote lines must be an array",
    );

    if (rawLines.length === 0) {
        throw new TypeError("Cannot create an empty merchandise quote");
    }

    const seenSku = new Set<string>();
    let currency: string | undefined;
    let totalMinorUnits = 0n;

    const lines = rawLines.map(rawLine => {
        const line = validateStructuralQuoteLine(rawLine);
        const key = skuKey(line.sku.id, line.sku.version);

        if (seenSku.has(key)) {
            throw new TypeError("Duplicate exact SKU quote line");
        }

        seenSku.add(key);

        if (currency === undefined) {
            currency = line.unitPrice.currency;
        }
        else if (currency !== line.unitPrice.currency) {
            throw new TypeError("Mixed-currency merchandise quote");
        }

        if (
            line.merchandiseSubtotal.currency !==
            line.unitPrice.currency
        ) {
            throw new TypeError("Quote line currency mismatch");
        }

        totalMinorUnits = addSafeMinorUnits(
            totalMinorUnits,
            line.merchandiseSubtotal,
        );

        return line;
    });

    const suppliedSubtotal = copyMoney(value.merchandiseSubtotal);

    if (
        suppliedSubtotal.currency !== currency ||
        BigInt(suppliedSubtotal.minorUnits) !== totalMinorUnits
    ) {
        throw new TypeError("Injected aggregate merchandise subtotal");
    }

    return Object.freeze({
        id: parseFoodMerchandiseQuoteId(value.id),
        version: validateFoodVersion(value.version),
        cart: Object.freeze({
            id: parseFoodCartId(cart.id),
            version: validateFoodVersion(cart.version),
        }),
        lines: Object.freeze(lines),
        merchandiseSubtotal: suppliedSubtotal,
    });
}

function selectedSkuSnapshots(
    cart: FoodCartVersion,
    inputs: unknown,
): ReadonlyMap<string, FoodSkuVersion> {
    const expectedKeys = new Set(
        cart.lines.map(line =>
            skuKey(line.sku.id, line.sku.version),
        ),
    );

    const selected = new Map<string, FoodSkuVersion>();

    for (const input of list(
        inputs,
        "Selected SKU snapshots must be an array",
    )) {
        const sku = validateFoodSkuVersion(input);
        const key = skuKey(sku.id, sku.version);

        if (!expectedKeys.has(key)) {
            throw new TypeError("Unexpected SKU snapshot for cart");
        }

        if (selected.has(key)) {
            throw new TypeError("Duplicate selected SKU snapshot");
        }

        selected.set(key, sku);
    }

    if (selected.size !== expectedKeys.size) {
        throw new TypeError("Missing exact SKU snapshot for cart line");
    }

    return selected;
}

function rawApprovedPriceSkuKey(input: unknown): string {
    const price = record(
        input,
        [
            "id",
            "version",
            "sku",
            "money",
            "approval",
            "candidateProvenance",
        ],
        "Invalid selected approved-price record",
    );

    const sku = record(
        price.sku,
        ["id", "version"],
        "Invalid selected approved-price SKU reference",
    );

    return skuKey(
        parseFoodSkuId(sku.id),
        validateFoodVersion(sku.version),
    );
}

function selectedApprovedPrices(
    cart: FoodCartVersion,
    skus: ReadonlyMap<string, FoodSkuVersion>,
    inputs: unknown,
): ReadonlyMap<string, FoodApprovedCommercialPriceVersion> {
    const expectedKeys = new Set(
        cart.lines.map(line =>
            skuKey(line.sku.id, line.sku.version),
        ),
    );

    const selected =
        new Map<string, FoodApprovedCommercialPriceVersion>();

    const authorityIds = new Set<FoodApprovedCommercialPriceId>();

    for (const input of list(
        inputs,
        "Selected approved prices must be an array",
    )) {
        const key = rawApprovedPriceSkuKey(input);
        const sku = skus.get(key);

        if (!sku || !expectedKeys.has(key)) {
            throw new TypeError(
                "Approved price does not match an exact cart SKU",
            );
        }

        const price =
            validateFoodApprovedCommercialPriceVersion(
                input,
                sku,
            );

        if (selected.has(key)) {
            throw new TypeError(
                "Multiple approved prices selected for one cart SKU",
            );
        }

        if (authorityIds.has(price.id)) {
            throw new TypeError(
                "Approved-price authority reused across quote lines",
            );
        }

        authorityIds.add(price.id);
        selected.set(key, price);
    }

    if (selected.size !== expectedKeys.size) {
        throw new TypeError(
            "Missing approved commercial price for cart line",
        );
    }

    return selected;
}

function deriveFoodMerchandiseQuoteVersion(
    identityInput: unknown,
    cartInput: unknown,
    skuInputs: unknown,
    priceInputs: unknown,
): FoodMerchandiseQuoteVersion {
    const identity = record(
        identityInput,
        ["id", "version"],
        "Invalid merchandise quote identity/version",
    );

    const cart = validateFoodCartVersion(cartInput);

    if (cart.lines.length === 0) {
        throw new TypeError("Cannot quote an empty food cart");
    }

    const skus = selectedSkuSnapshots(cart, skuInputs);
    const prices = selectedApprovedPrices(
        cart,
        skus,
        priceInputs,
    );

    let currency: string | undefined;
    let totalMinorUnits = 0n;

    const lines = cart.lines.map(cartLine => {
        const key = skuKey(
            cartLine.sku.id,
            cartLine.sku.version,
        );

        const price = prices.get(key);

        if (!price) {
            throw new TypeError(
                "Missing exact approved price during quote derivation",
            );
        }

        const unitPrice = copyMoney(price.money);

        if (currency === undefined) {
            currency = unitPrice.currency;
        }
        else if (currency !== unitPrice.currency) {
            throw new TypeError("Mixed-currency merchandise quote");
        }

        const merchandiseSubtotal = multiplyMoney(
            unitPrice,
            cartLine.quantity,
        );

        totalMinorUnits = addSafeMinorUnits(
            totalMinorUnits,
            merchandiseSubtotal,
        );

        return Object.freeze({
            sku: Object.freeze({
                id: cartLine.sku.id,
                version: cartLine.sku.version,
            }),
            approvedPrice: Object.freeze({
                id: price.id,
                version: price.version,
            }),
            quantity: cartLine.quantity,
            unitPrice,
            merchandiseSubtotal,
        });
    });

    if (currency === undefined) {
        throw new TypeError("Missing quote currency");
    }

    return validateFoodMerchandiseQuoteVersion({
        id: parseFoodMerchandiseQuoteId(identity.id),
        version: validateFoodVersion(identity.version),
        cart: {
            id: cart.id,
            version: cart.version,
        },
        lines,
        merchandiseSubtotal: {
            currency,
            minorUnits: Number(totalMinorUnits),
        },
    });
}

export function createInitialFoodMerchandiseQuoteVersion(
    identityInput: unknown,
    cartInput: unknown,
    skuInputs: unknown,
    priceInputs: unknown,
): FoodMerchandiseQuoteVersion {
    const quote = deriveFoodMerchandiseQuoteVersion(
        identityInput,
        cartInput,
        skuInputs,
        priceInputs,
    );

    if (quote.version !== 1) {
        throw new TypeError(
            "Initial merchandise quote version must be one",
        );
    }

    return quote;
}

export function reviseFoodMerchandiseQuoteVersion(
    previousInput: unknown,
    nextIdentityInput: unknown,
    cartInput: unknown,
    skuInputs: unknown,
    priceInputs: unknown,
): FoodMerchandiseQuoteVersion {
    const previous =
        validateFoodMerchandiseQuoteVersion(previousInput);

    const next = deriveFoodMerchandiseQuoteVersion(
        nextIdentityInput,
        cartInput,
        skuInputs,
        priceInputs,
    );

    if (previous.id !== next.id) {
        throw new TypeError("Merchandise quote identity drift");
    }

    if (previous.cart.id !== next.cart.id) {
        throw new TypeError("Merchandise quote cart identity drift");
    }

    if (
        previous.version === Number.MAX_SAFE_INTEGER ||
        next.version !== previous.version + 1
    ) {
        throw new TypeError(
            "Merchandise quote revision must be consecutive",
        );
    }

    return next;
}

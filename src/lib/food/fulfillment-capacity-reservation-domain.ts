/**
 * FOOD-005D
 *
 * Pure fulfillment intent, SKU-capacity requirement and reservation-request
 * contracts. Nothing in this module performs or proves an inventory/slot hold.
 */
import { validateFoodVersion } from "./draft-domain";
import {
    parseFoodSkuId,
    type FoodSkuId,
} from "./package-sku-domain";
import {
    parseFoodMerchandiseQuoteId,
    validateFoodMerchandiseQuoteVersion,
    validateFoodPurchaseQuantity,
    type FoodMerchandiseQuoteId,
} from "./cart-quote-domain";

export type FoodFulfillmentIntentId =
    string & { readonly __brand: "FoodFulfillmentIntentId" };

export type FoodReservationRequestId =
    string & { readonly __brand: "FoodReservationRequestId" };

export type FoodFulfillmentMethod =
    | "personal-delivery"
    | "meetup";

export interface FoodFulfillmentIntentVersion {
    readonly id: FoodFulfillmentIntentId;
    readonly version: number;
    readonly quote: Readonly<{
        id: FoodMerchandiseQuoteId;
        version: number;
    }>;
    readonly method: FoodFulfillmentMethod;
    readonly locationReference: string;
    readonly windowReference: string;
}

export interface FoodCapacityRequirementLine {
    readonly sku: Readonly<{
        id: FoodSkuId;
        version: number;
    }>;
    readonly quantity: number;
}

export interface FoodReservationRequestVersion {
    readonly id: FoodReservationRequestId;
    readonly version: number;
    readonly quote: Readonly<{
        id: FoodMerchandiseQuoteId;
        version: number;
    }>;
    readonly fulfillmentIntent: Readonly<{
        id: FoodFulfillmentIntentId;
        version: number;
    }>;
    readonly capacityRequirements:
        readonly FoodCapacityRequirementLine[];
}

function strictRecord(
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

function strictList(
    value: unknown,
    message: string,
): readonly unknown[] {
    if (!Array.isArray(value)) {
        throw new TypeError(message);
    }

    return value;
}

function boundedText(
    value: unknown,
    maximum: number,
    message: string,
): string {
    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value ||
        value.length > maximum
    ) {
        throw new TypeError(message);
    }

    return value;
}

function localIdentity(value: unknown): string {
    const text = boundedText(
        value,
        128,
        "Invalid FOOD-005D local identity",
    );

    if (text.includes(":")) {
        throw new TypeError(
            "FOOD-005D local identity cannot contain a colon",
        );
    }

    return text;
}

export function createFoodFulfillmentIntentId(
    value: unknown,
): FoodFulfillmentIntentId {
    return (
        `food-fulfillment-intent:${localIdentity(value)}` as FoodFulfillmentIntentId
    );
}

export function parseFoodFulfillmentIntentId(
    value: unknown,
): FoodFulfillmentIntentId {
    const prefix = "food-fulfillment-intent:";
    const text = boundedText(
        value,
        prefix.length + 128,
        "Invalid food fulfillment intent identity",
    );

    if (!text.startsWith(prefix)) {
        throw new TypeError(
            "Wrong food fulfillment intent identity prefix",
        );
    }

    return createFoodFulfillmentIntentId(
        text.slice(prefix.length),
    );
}

export function createFoodReservationRequestId(
    value: unknown,
): FoodReservationRequestId {
    return (
        `food-reservation-request:${localIdentity(value)}` as FoodReservationRequestId
    );
}

export function parseFoodReservationRequestId(
    value: unknown,
): FoodReservationRequestId {
    const prefix = "food-reservation-request:";
    const text = boundedText(
        value,
        prefix.length + 128,
        "Invalid food reservation request identity",
    );

    if (!text.startsWith(prefix)) {
        throw new TypeError(
            "Wrong food reservation request identity prefix",
        );
    }

    return createFoodReservationRequestId(
        text.slice(prefix.length),
    );
}

export function validateFoodFulfillmentMethod(
    value: unknown,
): FoodFulfillmentMethod {
    if (
        value !== "personal-delivery" &&
        value !== "meetup"
    ) {
        throw new TypeError(
            "Unsupported FOOD fulfillment method",
        );
    }

    return value;
}

function copyQuoteReference(
    input: unknown,
): Readonly<{
    id: FoodMerchandiseQuoteId;
    version: number;
}> {
    const value = strictRecord(
        input,
        ["id", "version"],
        "Invalid merchandise quote reference",
    );

    return Object.freeze({
        id: parseFoodMerchandiseQuoteId(value.id),
        version: validateFoodVersion(value.version),
    });
}

export function validateFoodFulfillmentIntentVersion(
    input: unknown,
): FoodFulfillmentIntentVersion {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "quote",
            "method",
            "locationReference",
            "windowReference",
        ],
        "Invalid food fulfillment intent",
    );

    return Object.freeze({
        id: parseFoodFulfillmentIntentId(value.id),
        version: validateFoodVersion(value.version),
        quote: copyQuoteReference(value.quote),
        method: validateFoodFulfillmentMethod(
            value.method,
        ),
        locationReference: boundedText(
            value.locationReference,
            512,
            "Invalid fulfillment location reference",
        ),
        windowReference: boundedText(
            value.windowReference,
            512,
            "Invalid fulfillment window reference",
        ),
    });
}

function deriveFoodFulfillmentIntentVersion(
    identityInput: unknown,
    quoteInput: unknown,
    detailsInput: unknown,
): FoodFulfillmentIntentVersion {
    const identity = strictRecord(
        identityInput,
        ["id", "version"],
        "Invalid fulfillment intent identity/version",
    );

    const details = strictRecord(
        detailsInput,
        [
            "method",
            "locationReference",
            "windowReference",
        ],
        "Invalid fulfillment intent details",
    );

    const quote =
        validateFoodMerchandiseQuoteVersion(
            quoteInput,
        );

    return validateFoodFulfillmentIntentVersion({
        id: parseFoodFulfillmentIntentId(
            identity.id,
        ),
        version: validateFoodVersion(
            identity.version,
        ),
        quote: {
            id: quote.id,
            version: quote.version,
        },
        method: validateFoodFulfillmentMethod(
            details.method,
        ),
        locationReference: boundedText(
            details.locationReference,
            512,
            "Invalid fulfillment location reference",
        ),
        windowReference: boundedText(
            details.windowReference,
            512,
            "Invalid fulfillment window reference",
        ),
    });
}

export function createInitialFoodFulfillmentIntentVersion(
    identityInput: unknown,
    quoteInput: unknown,
    detailsInput: unknown,
): FoodFulfillmentIntentVersion {
    const value =
        deriveFoodFulfillmentIntentVersion(
            identityInput,
            quoteInput,
            detailsInput,
        );

    if (value.version !== 1) {
        throw new TypeError(
            "Initial fulfillment intent version must be one",
        );
    }

    return value;
}

export function reviseFoodFulfillmentIntentVersion(
    previousInput: unknown,
    nextIdentityInput: unknown,
    quoteInput: unknown,
    detailsInput: unknown,
): FoodFulfillmentIntentVersion {
    const previous =
        validateFoodFulfillmentIntentVersion(
            previousInput,
        );

    const next =
        deriveFoodFulfillmentIntentVersion(
            nextIdentityInput,
            quoteInput,
            detailsInput,
        );

    if (previous.id !== next.id) {
        throw new TypeError(
            "Fulfillment intent identity drift",
        );
    }

    if (previous.quote.id !== next.quote.id) {
        throw new TypeError(
            "Fulfillment intent quote identity drift",
        );
    }

    if (
        previous.version === Number.MAX_SAFE_INTEGER ||
        next.version !== previous.version + 1
    ) {
        throw new TypeError(
            "Fulfillment intent revision must be consecutive",
        );
    }

    return next;
}

function capacityRequirementKey(
    id: FoodSkuId,
    version: number,
): string {
    return `${id}@${version}`;
}

function validateFoodCapacityRequirementLine(
    input: unknown,
): FoodCapacityRequirementLine {
    const line = strictRecord(
        input,
        ["sku", "quantity"],
        "Invalid FOOD capacity requirement",
    );

    const sku = strictRecord(
        line.sku,
        ["id", "version"],
        "Invalid FOOD capacity requirement SKU",
    );

    return Object.freeze({
        sku: Object.freeze({
            id: parseFoodSkuId(sku.id),
            version: validateFoodVersion(
                sku.version,
            ),
        }),
        quantity: validateFoodPurchaseQuantity(
            line.quantity,
        ),
    });
}

export function validateFoodReservationRequestVersion(
    input: unknown,
): FoodReservationRequestVersion {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "quote",
            "fulfillmentIntent",
            "capacityRequirements",
        ],
        "Invalid food reservation request",
    );

    const intent = strictRecord(
        value.fulfillmentIntent,
        ["id", "version"],
        "Invalid fulfillment intent reference",
    );

    const seen = new Set<string>();

    const capacityRequirements = strictList(
        value.capacityRequirements,
        "Capacity requirements must be an array",
    ).map(rawLine => {
        const line =
            validateFoodCapacityRequirementLine(
                rawLine,
            );

        const key = capacityRequirementKey(
            line.sku.id,
            line.sku.version,
        );

        if (seen.has(key)) {
            throw new TypeError(
                "Duplicate exact SKU capacity requirement",
            );
        }

        seen.add(key);
        return line;
    });

    if (capacityRequirements.length === 0) {
        throw new TypeError(
            "Reservation request requires capacity demand",
        );
    }

    return Object.freeze({
        id: parseFoodReservationRequestId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
        quote: copyQuoteReference(
            value.quote,
        ),
        fulfillmentIntent: Object.freeze({
            id: parseFoodFulfillmentIntentId(
                intent.id,
            ),
            version: validateFoodVersion(
                intent.version,
            ),
        }),
        capacityRequirements:
            Object.freeze(capacityRequirements),
    });
}

function assertExactSources(
    request: FoodReservationRequestVersion,
    quoteInput: unknown,
    intentInput: unknown,
): void {
    const quote =
        validateFoodMerchandiseQuoteVersion(
            quoteInput,
        );

    const intent =
        validateFoodFulfillmentIntentVersion(
            intentInput,
        );

    if (
        request.quote.id !== quote.id ||
        request.quote.version !== quote.version
    ) {
        throw new TypeError(
            "Reservation request quote mismatch",
        );
    }

    if (
        request.fulfillmentIntent.id !== intent.id ||
        request.fulfillmentIntent.version !==
            intent.version
    ) {
        throw new TypeError(
            "Reservation request fulfillment intent mismatch",
        );
    }

    if (
        intent.quote.id !== quote.id ||
        intent.quote.version !== quote.version
    ) {
        throw new TypeError(
            "Fulfillment intent does not match exact quote",
        );
    }

    if (
        request.capacityRequirements.length !==
        quote.lines.length
    ) {
        throw new TypeError(
            "Reservation capacity requirement count mismatch",
        );
    }

    for (
        let index = 0;
        index < quote.lines.length;
        index += 1
    ) {
        const quoteLine = quote.lines[index];
        const requirement =
            request.capacityRequirements[index];

        if (!quoteLine || !requirement) {
            throw new TypeError(
                "Missing reservation capacity requirement",
            );
        }

        if (
            requirement.sku.id !==
                quoteLine.sku.id ||
            requirement.sku.version !==
                quoteLine.sku.version ||
            requirement.quantity !==
                quoteLine.quantity
        ) {
            throw new TypeError(
                "Reservation capacity demand differs from quote",
            );
        }
    }
}

export function validateFoodReservationRequestAgainstSources(
    input: unknown,
    quoteInput: unknown,
    intentInput: unknown,
): FoodReservationRequestVersion {
    const request =
        validateFoodReservationRequestVersion(
            input,
        );

    assertExactSources(
        request,
        quoteInput,
        intentInput,
    );

    return request;
}

function deriveFoodReservationRequestVersion(
    identityInput: unknown,
    quoteInput: unknown,
    intentInput: unknown,
): FoodReservationRequestVersion {
    const identity = strictRecord(
        identityInput,
        ["id", "version"],
        "Invalid reservation request identity/version",
    );

    const quote =
        validateFoodMerchandiseQuoteVersion(
            quoteInput,
        );

    const intent =
        validateFoodFulfillmentIntentVersion(
            intentInput,
        );

    if (
        intent.quote.id !== quote.id ||
        intent.quote.version !== quote.version
    ) {
        throw new TypeError(
            "Fulfillment intent does not match exact quote",
        );
    }

    const capacityRequirements =
        quote.lines.map(line =>
            Object.freeze({
                sku: Object.freeze({
                    id: line.sku.id,
                    version: line.sku.version,
                }),
                quantity: line.quantity,
            }),
        );

    return validateFoodReservationRequestAgainstSources(
        {
            id: parseFoodReservationRequestId(
                identity.id,
            ),
            version: validateFoodVersion(
                identity.version,
            ),
            quote: {
                id: quote.id,
                version: quote.version,
            },
            fulfillmentIntent: {
                id: intent.id,
                version: intent.version,
            },
            capacityRequirements,
        },
        quote,
        intent,
    );
}

export function createInitialFoodReservationRequestVersion(
    identityInput: unknown,
    quoteInput: unknown,
    intentInput: unknown,
): FoodReservationRequestVersion {
    const value =
        deriveFoodReservationRequestVersion(
            identityInput,
            quoteInput,
            intentInput,
        );

    if (value.version !== 1) {
        throw new TypeError(
            "Initial reservation request version must be one",
        );
    }

    return value;
}

export function reviseFoodReservationRequestVersion(
    previousInput: unknown,
    nextIdentityInput: unknown,
    quoteInput: unknown,
    intentInput: unknown,
): FoodReservationRequestVersion {
    const previous =
        validateFoodReservationRequestVersion(
            previousInput,
        );

    const next =
        deriveFoodReservationRequestVersion(
            nextIdentityInput,
            quoteInput,
            intentInput,
        );

    if (previous.id !== next.id) {
        throw new TypeError(
            "Reservation request identity drift",
        );
    }

    if (previous.quote.id !== next.quote.id) {
        throw new TypeError(
            "Reservation request quote identity drift",
        );
    }

    if (
        previous.fulfillmentIntent.id !==
        next.fulfillmentIntent.id
    ) {
        throw new TypeError(
            "Reservation request fulfillment intent identity drift",
        );
    }

    if (
        previous.version === Number.MAX_SAFE_INTEGER ||
        next.version !== previous.version + 1
    ) {
        throw new TypeError(
            "Reservation request revision must be consecutive",
        );
    }

    return next;
}

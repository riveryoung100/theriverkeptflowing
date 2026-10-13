/**
 * FOOD-005E
 *
 * Immutable pre-payment physical order truth.
 *
 * An order here is a requested physical order snapshot. It is not payment,
 * sale completion, reservation acceptance, dispatch authority or fulfillment.
 */
import { validateFoodVersion } from "./draft-domain";
import {
    validateFoodMoney,
    type FoodMoney,
} from "./cost-pricing-domain";
import {
    parseFoodSkuId,
    type FoodSkuId,
} from "./package-sku-domain";
import {
    parseFoodApprovedCommercialPriceId,
    type FoodApprovedCommercialPriceId,
} from "./approved-commercial-price-domain";
import {
    parseFoodMerchandiseQuoteId,
    validateFoodMerchandiseQuoteVersion,
    validateFoodPurchaseQuantity,
    type FoodMerchandiseQuoteId,
} from "./cart-quote-domain";
import {
    parseFoodFulfillmentIntentId,
    parseFoodReservationRequestId,
    validateFoodFulfillmentIntentVersion,
    validateFoodFulfillmentMethod,
    validateFoodReservationRequestAgainstSources,
    type FoodFulfillmentIntentId,
    type FoodFulfillmentMethod,
    type FoodReservationRequestId,
} from "./fulfillment-capacity-reservation-domain";

export type FoodPhysicalOrderId =
    string & { readonly __brand: "FoodPhysicalOrderId" };

export type FoodPhysicalOrderState =
    | "requested"
    | "cancelled";

export interface FoodPhysicalOrderLine {
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

export interface FoodPhysicalOrderVersion {
    readonly id: FoodPhysicalOrderId;
    readonly version: number;
    readonly state: FoodPhysicalOrderState;
    readonly quote: Readonly<{
        id: FoodMerchandiseQuoteId;
        version: number;
    }>;
    readonly fulfillmentIntent: Readonly<{
        id: FoodFulfillmentIntentId;
        version: number;
        method: FoodFulfillmentMethod;
        locationReference: string;
        windowReference: string;
    }>;
    readonly reservationRequest: Readonly<{
        id: FoodReservationRequestId;
        version: number;
        capacityRequirements: readonly Readonly<{
            sku: Readonly<{
                id: FoodSkuId;
                version: number;
            }>;
            quantity: number;
        }>[];
    }>;
    readonly lines: readonly FoodPhysicalOrderLine[];
    readonly merchandiseSubtotal: FoodMoney;
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
        "Invalid physical order local identity",
    );

    if (text.includes(":")) {
        throw new TypeError(
            "Physical order local identity cannot contain a colon",
        );
    }

    return text;
}

export function createFoodPhysicalOrderId(
    value: unknown,
): FoodPhysicalOrderId {
    return `food-physical-order:${localIdentity(value)}` as FoodPhysicalOrderId;
}

export function parseFoodPhysicalOrderId(
    value: unknown,
): FoodPhysicalOrderId {
    const prefix = "food-physical-order:";

    const text = boundedText(
        value,
        prefix.length + 128,
        "Invalid food physical order identity",
    );

    if (!text.startsWith(prefix)) {
        throw new TypeError(
            "Wrong food physical order identity prefix",
        );
    }

    return createFoodPhysicalOrderId(
        text.slice(prefix.length),
    );
}

export function validateFoodPhysicalOrderState(
    value: unknown,
): FoodPhysicalOrderState {
    if (
        value !== "requested" &&
        value !== "cancelled"
    ) {
        throw new TypeError(
            "Unsupported food physical order state",
        );
    }

    return value;
}

function moneyEqual(
    left: FoodMoney,
    right: FoodMoney,
): boolean {
    return (
        left.currency === right.currency &&
        left.minorUnits === right.minorUnits
    );
}

function checkedMultiply(
    minorUnits: number,
    quantity: number,
): number {
    const result =
        BigInt(minorUnits) * BigInt(quantity);

    if (
        result >
        BigInt(Number.MAX_SAFE_INTEGER)
    ) {
        throw new TypeError(
            "Physical order line subtotal exceeds safe integer",
        );
    }

    return Number(result);
}

function checkedAdd(
    left: number,
    right: number,
): number {
    const result =
        BigInt(left) + BigInt(right);

    if (
        result >
        BigInt(Number.MAX_SAFE_INTEGER)
    ) {
        throw new TypeError(
            "Physical order subtotal exceeds safe integer",
        );
    }

    return Number(result);
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
        "Invalid physical order quote reference",
    );

    return Object.freeze({
        id: parseFoodMerchandiseQuoteId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
    });
}

function copyFulfillmentIntentSnapshot(
    input: unknown,
): FoodPhysicalOrderVersion["fulfillmentIntent"] {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "method",
            "locationReference",
            "windowReference",
        ],
        "Invalid physical order fulfillment snapshot",
    );

    return Object.freeze({
        id: parseFoodFulfillmentIntentId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
        method: validateFoodFulfillmentMethod(
            value.method,
        ),
        locationReference: boundedText(
            value.locationReference,
            512,
            "Invalid order fulfillment location reference",
        ),
        windowReference: boundedText(
            value.windowReference,
            512,
            "Invalid order fulfillment window reference",
        ),
    });
}

function copyCapacityRequirement(
    input: unknown,
): Readonly<{
    sku: Readonly<{
        id: FoodSkuId;
        version: number;
    }>;
    quantity: number;
}> {
    const line = strictRecord(
        input,
        ["sku", "quantity"],
        "Invalid physical order capacity requirement",
    );

    const sku = strictRecord(
        line.sku,
        ["id", "version"],
        "Invalid physical order capacity SKU",
    );

    return Object.freeze({
        sku: Object.freeze({
            id: parseFoodSkuId(
                sku.id,
            ),
            version: validateFoodVersion(
                sku.version,
            ),
        }),
        quantity: validateFoodPurchaseQuantity(
            line.quantity,
        ),
    });
}

function copyReservationRequestSnapshot(
    input: unknown,
): FoodPhysicalOrderVersion["reservationRequest"] {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "capacityRequirements",
        ],
        "Invalid physical order reservation-request snapshot",
    );

    const requirements = strictList(
        value.capacityRequirements,
        "Physical order capacity requirements must be an array",
    ).map(copyCapacityRequirement);

    if (requirements.length === 0) {
        throw new TypeError(
            "Physical order requires capacity requirements",
        );
    }

    const seen = new Set<string>();

    for (const requirement of requirements) {
        const key =
            `${requirement.sku.id}@${requirement.sku.version}`;

        if (seen.has(key)) {
            throw new TypeError(
                "Duplicate physical order capacity requirement",
            );
        }

        seen.add(key);
    }

    return Object.freeze({
        id: parseFoodReservationRequestId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
        capacityRequirements:
            Object.freeze(requirements),
    });
}

function copyOrderLine(
    input: unknown,
): FoodPhysicalOrderLine {
    const line = strictRecord(
        input,
        [
            "sku",
            "approvedPrice",
            "quantity",
            "unitPrice",
            "merchandiseSubtotal",
        ],
        "Invalid physical order line",
    );

    const sku = strictRecord(
        line.sku,
        ["id", "version"],
        "Invalid physical order SKU reference",
    );

    const approvedPrice = strictRecord(
        line.approvedPrice,
        ["id", "version"],
        "Invalid physical order approved-price reference",
    );

    const quantity =
        validateFoodPurchaseQuantity(
            line.quantity,
        );

    const unitPrice =
        validateFoodMoney(
            line.unitPrice,
        );

    const merchandiseSubtotal =
        validateFoodMoney(
            line.merchandiseSubtotal,
        );

    if (
        unitPrice.currency !==
        merchandiseSubtotal.currency
    ) {
        throw new TypeError(
            "Physical order line currency mismatch",
        );
    }

    if (
        checkedMultiply(
            unitPrice.minorUnits,
            quantity,
        ) !== merchandiseSubtotal.minorUnits
    ) {
        throw new TypeError(
            "Physical order line subtotal mismatch",
        );
    }

    return Object.freeze({
        sku: Object.freeze({
            id: parseFoodSkuId(
                sku.id,
            ),
            version: validateFoodVersion(
                sku.version,
            ),
        }),
        approvedPrice: Object.freeze({
            id:
                parseFoodApprovedCommercialPriceId(
                    approvedPrice.id,
                ),
            version: validateFoodVersion(
                approvedPrice.version,
            ),
        }),
        quantity,
        unitPrice,
        merchandiseSubtotal,
    });
}

export function validateFoodPhysicalOrderVersion(
    input: unknown,
): FoodPhysicalOrderVersion {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "state",
            "quote",
            "fulfillmentIntent",
            "reservationRequest",
            "lines",
            "merchandiseSubtotal",
        ],
        "Invalid food physical order",
    );

    const lines = strictList(
        value.lines,
        "Physical order lines must be an array",
    ).map(copyOrderLine);

    if (lines.length === 0) {
        throw new TypeError(
            "Physical order requires at least one line",
        );
    }

    const seen = new Set<string>();

    for (const line of lines) {
        const key =
            `${line.sku.id}@${line.sku.version}`;

        if (seen.has(key)) {
            throw new TypeError(
                "Duplicate exact SKU physical order line",
            );
        }

        seen.add(key);
    }

    const subtotal =
        validateFoodMoney(
            value.merchandiseSubtotal,
        );

    let totalMinorUnits = 0;

    for (const line of lines) {
        if (
            line.merchandiseSubtotal.currency !==
            subtotal.currency
        ) {
            throw new TypeError(
                "Mixed-currency physical order",
            );
        }

        totalMinorUnits = checkedAdd(
            totalMinorUnits,
            line.merchandiseSubtotal.minorUnits,
        );
    }

    if (
        totalMinorUnits !==
        subtotal.minorUnits
    ) {
        throw new TypeError(
            "Physical order merchandise subtotal mismatch",
        );
    }

    const reservationRequest =
        copyReservationRequestSnapshot(
            value.reservationRequest,
        );

    if (
        reservationRequest.capacityRequirements.length !==
        lines.length
    ) {
        throw new TypeError(
            "Physical order capacity requirement count mismatch",
        );
    }

    for (
        let index = 0;
        index < lines.length;
        index += 1
    ) {
        const line = lines[index];
        const requirement =
            reservationRequest
                .capacityRequirements[index];

        if (!line || !requirement) {
            throw new TypeError(
                "Missing physical order capacity requirement",
            );
        }

        if (
            line.sku.id !== requirement.sku.id ||
            line.sku.version !==
                requirement.sku.version ||
            line.quantity !==
                requirement.quantity
        ) {
            throw new TypeError(
                "Physical order capacity demand differs from merchandise",
            );
        }
    }

    return Object.freeze({
        id: parseFoodPhysicalOrderId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
        state: validateFoodPhysicalOrderState(
            value.state,
        ),
        quote: copyQuoteReference(
            value.quote,
        ),
        fulfillmentIntent:
            copyFulfillmentIntentSnapshot(
                value.fulfillmentIntent,
            ),
        reservationRequest,
        lines: Object.freeze(lines),
        merchandiseSubtotal: subtotal,
    });
}

function assertExactOrderSources(
    order: FoodPhysicalOrderVersion,
    quoteInput: unknown,
    fulfillmentIntentInput: unknown,
    reservationRequestInput: unknown,
): void {
    const quote =
        validateFoodMerchandiseQuoteVersion(
            quoteInput,
        );

    const fulfillmentIntent =
        validateFoodFulfillmentIntentVersion(
            fulfillmentIntentInput,
        );

    const reservationRequest =
        validateFoodReservationRequestAgainstSources(
            reservationRequestInput,
            quote,
            fulfillmentIntent,
        );

    if (
        order.quote.id !== quote.id ||
        order.quote.version !== quote.version
    ) {
        throw new TypeError(
            "Physical order quote mismatch",
        );
    }

    if (
        order.fulfillmentIntent.id !==
            fulfillmentIntent.id ||
        order.fulfillmentIntent.version !==
            fulfillmentIntent.version ||
        order.fulfillmentIntent.method !==
            fulfillmentIntent.method ||
        order.fulfillmentIntent.locationReference !==
            fulfillmentIntent.locationReference ||
        order.fulfillmentIntent.windowReference !==
            fulfillmentIntent.windowReference
    ) {
        throw new TypeError(
            "Physical order fulfillment snapshot mismatch",
        );
    }

    if (
        order.reservationRequest.id !==
            reservationRequest.id ||
        order.reservationRequest.version !==
            reservationRequest.version
    ) {
        throw new TypeError(
            "Physical order reservation-request mismatch",
        );
    }

    if (
        order.lines.length !==
        quote.lines.length
    ) {
        throw new TypeError(
            "Physical order line count mismatch",
        );
    }

    for (
        let index = 0;
        index < quote.lines.length;
        index += 1
    ) {
        const orderLine = order.lines[index];
        const quoteLine = quote.lines[index];

        if (!orderLine || !quoteLine) {
            throw new TypeError(
                "Missing physical order merchandise line",
            );
        }

        if (
            orderLine.sku.id !== quoteLine.sku.id ||
            orderLine.sku.version !==
                quoteLine.sku.version ||
            orderLine.approvedPrice.id !==
                quoteLine.approvedPrice.id ||
            orderLine.approvedPrice.version !==
                quoteLine.approvedPrice.version ||
            orderLine.quantity !==
                quoteLine.quantity ||
            !moneyEqual(
                orderLine.unitPrice,
                quoteLine.unitPrice,
            ) ||
            !moneyEqual(
                orderLine.merchandiseSubtotal,
                quoteLine.merchandiseSubtotal,
            )
        ) {
            throw new TypeError(
                "Physical order merchandise differs from exact quote",
            );
        }
    }

    if (
        !moneyEqual(
            order.merchandiseSubtotal,
            quote.merchandiseSubtotal,
        )
    ) {
        throw new TypeError(
            "Physical order aggregate differs from exact quote",
        );
    }

    if (
        order.reservationRequest
            .capacityRequirements.length !==
        reservationRequest
            .capacityRequirements.length
    ) {
        throw new TypeError(
            "Physical order capacity snapshot count mismatch",
        );
    }

    for (
        let index = 0;
        index <
        reservationRequest.capacityRequirements.length;
        index += 1
    ) {
        const orderRequirement =
            order.reservationRequest
                .capacityRequirements[index];

        const sourceRequirement =
            reservationRequest
                .capacityRequirements[index];

        if (
            !orderRequirement ||
            !sourceRequirement ||
            orderRequirement.sku.id !==
                sourceRequirement.sku.id ||
            orderRequirement.sku.version !==
                sourceRequirement.sku.version ||
            orderRequirement.quantity !==
                sourceRequirement.quantity
        ) {
            throw new TypeError(
                "Physical order capacity snapshot mismatch",
            );
        }
    }
}

export function validateFoodPhysicalOrderAgainstSources(
    input: unknown,
    quoteInput: unknown,
    fulfillmentIntentInput: unknown,
    reservationRequestInput: unknown,
): FoodPhysicalOrderVersion {
    const order =
        validateFoodPhysicalOrderVersion(
            input,
        );

    assertExactOrderSources(
        order,
        quoteInput,
        fulfillmentIntentInput,
        reservationRequestInput,
    );

    return order;
}

export function createInitialFoodPhysicalOrderVersion(
    identityInput: unknown,
    quoteInput: unknown,
    fulfillmentIntentInput: unknown,
    reservationRequestInput: unknown,
): FoodPhysicalOrderVersion {
    const identity = strictRecord(
        identityInput,
        ["id", "version"],
        "Invalid physical order identity/version",
    );

    const quote =
        validateFoodMerchandiseQuoteVersion(
            quoteInput,
        );

    const fulfillmentIntent =
        validateFoodFulfillmentIntentVersion(
            fulfillmentIntentInput,
        );

    const reservationRequest =
        validateFoodReservationRequestAgainstSources(
            reservationRequestInput,
            quote,
            fulfillmentIntent,
        );

    const version = validateFoodVersion(
        identity.version,
    );

    if (version !== 1) {
        throw new TypeError(
            "Initial physical order version must be one",
        );
    }

    return validateFoodPhysicalOrderAgainstSources(
        {
            id: parseFoodPhysicalOrderId(
                identity.id,
            ),
            version,
            state: "requested",
            quote: {
                id: quote.id,
                version: quote.version,
            },
            fulfillmentIntent: {
                id: fulfillmentIntent.id,
                version:
                    fulfillmentIntent.version,
                method:
                    fulfillmentIntent.method,
                locationReference:
                    fulfillmentIntent
                        .locationReference,
                windowReference:
                    fulfillmentIntent
                        .windowReference,
            },
            reservationRequest: {
                id: reservationRequest.id,
                version:
                    reservationRequest.version,
                capacityRequirements:
                    reservationRequest
                        .capacityRequirements,
            },
            lines: quote.lines,
            merchandiseSubtotal:
                quote.merchandiseSubtotal,
        },
        quote,
        fulfillmentIntent,
        reservationRequest,
    );
}

export function cancelFoodPhysicalOrderVersion(
    previousInput: unknown,
    nextIdentityInput: unknown,
): FoodPhysicalOrderVersion {
    const previous =
        validateFoodPhysicalOrderVersion(
            previousInput,
        );

    if (previous.state !== "requested") {
        throw new TypeError(
            "Only a requested physical order can be cancelled",
        );
    }

    const identity = strictRecord(
        nextIdentityInput,
        ["id", "version"],
        "Invalid physical order cancellation identity/version",
    );

    const nextId =
        parseFoodPhysicalOrderId(
            identity.id,
        );

    const nextVersion =
        validateFoodVersion(
            identity.version,
        );

    if (nextId !== previous.id) {
        throw new TypeError(
            "Physical order identity drift",
        );
    }

    if (
        previous.version ===
            Number.MAX_SAFE_INTEGER ||
        nextVersion !==
            previous.version + 1
    ) {
        throw new TypeError(
            "Physical order revision must be consecutive",
        );
    }

    return validateFoodPhysicalOrderVersion({
        id: previous.id,
        version: nextVersion,
        state: "cancelled",
        quote: previous.quote,
        fulfillmentIntent:
            previous.fulfillmentIntent,
        reservationRequest:
            previous.reservationRequest,
        lines: previous.lines,
        merchandiseSubtotal:
            previous.merchandiseSubtotal,
    });
}

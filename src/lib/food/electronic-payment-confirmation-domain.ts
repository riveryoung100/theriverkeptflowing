/**
 * FOOD-005F
 *
 * Provider-neutral electronic payment confirmation evidence.
 *
 * A confirmation records an asserted server/provider-confirmed electronic
 * payment occurrence against one exact physical-order version. It does not
 * establish paid-in-full order status, dispatch authority, settlement,
 * refund state, processor authenticity or final payable-total correctness.
 */
import { validateFoodVersion } from "./draft-domain";
import {
    validateFoodMoney,
    type FoodMoney,
} from "./cost-pricing-domain";
import {
    parseFoodPhysicalOrderId,
    validateFoodPhysicalOrderVersion,
    type FoodPhysicalOrderId,
} from "./physical-order-domain";

export type FoodElectronicPaymentConfirmationId =
    string & {
        readonly __brand:
            "FoodElectronicPaymentConfirmationId";
    };

export interface FoodElectronicPaymentConfirmationVersion {
    readonly id: FoodElectronicPaymentConfirmationId;
    readonly version: number;
    readonly order: Readonly<{
        id: FoodPhysicalOrderId;
        version: number;
        merchandiseSubtotal: FoodMoney;
    }>;
    readonly evidence: Readonly<{
        channel: "electronic-processor";
        processor: string;
        processorPaymentReference: string;
        confirmationSourceReference: string;
        confirmedAmount: FoodMoney;
    }>;
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

function localIdentity(
    value: unknown,
): string {
    const text = boundedText(
        value,
        128,
        "Invalid electronic payment confirmation local identity",
    );

    if (text.includes(":")) {
        throw new TypeError(
            "Electronic payment confirmation local identity cannot contain a colon",
        );
    }

    return text;
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

export function createFoodElectronicPaymentConfirmationId(
    value: unknown,
): FoodElectronicPaymentConfirmationId {
    return (
        `food-electronic-payment-confirmation:${localIdentity(value)}` as
        FoodElectronicPaymentConfirmationId
    );
}

export function parseFoodElectronicPaymentConfirmationId(
    value: unknown,
): FoodElectronicPaymentConfirmationId {
    const prefix =
        "food-electronic-payment-confirmation:";

    const text = boundedText(
        value,
        prefix.length + 128,
        "Invalid electronic payment confirmation identity",
    );

    if (!text.startsWith(prefix)) {
        throw new TypeError(
            "Wrong electronic payment confirmation identity prefix",
        );
    }

    return createFoodElectronicPaymentConfirmationId(
        text.slice(prefix.length),
    );
}

function copyOrderSnapshot(
    input: unknown,
): FoodElectronicPaymentConfirmationVersion["order"] {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "merchandiseSubtotal",
        ],
        "Invalid payment-confirmation order snapshot",
    );

    return Object.freeze({
        id: parseFoodPhysicalOrderId(
            value.id,
        ),
        version: validateFoodVersion(
            value.version,
        ),
        merchandiseSubtotal:
            validateFoodMoney(
                value.merchandiseSubtotal,
            ),
    });
}

function copyEvidence(
    input: unknown,
): FoodElectronicPaymentConfirmationVersion["evidence"] {
    const value = strictRecord(
        input,
        [
            "channel",
            "processor",
            "processorPaymentReference",
            "confirmationSourceReference",
            "confirmedAmount",
        ],
        "Invalid electronic payment confirmation evidence",
    );

    if (
        value.channel !==
        "electronic-processor"
    ) {
        throw new TypeError(
            "Unsupported payment confirmation channel",
        );
    }

    return Object.freeze({
        channel: "electronic-processor",
        processor: boundedText(
            value.processor,
            128,
            "Invalid payment processor identity",
        ),
        processorPaymentReference:
            boundedText(
                value.processorPaymentReference,
                512,
                "Invalid processor payment reference",
            ),
        confirmationSourceReference:
            boundedText(
                value.confirmationSourceReference,
                512,
                "Invalid payment confirmation source reference",
            ),
        confirmedAmount:
            validateFoodMoney(
                value.confirmedAmount,
            ),
    });
}

export function validateFoodElectronicPaymentConfirmationVersion(
    input: unknown,
): FoodElectronicPaymentConfirmationVersion {
    const value = strictRecord(
        input,
        [
            "id",
            "version",
            "order",
            "evidence",
        ],
        "Invalid electronic payment confirmation",
    );

    return Object.freeze({
        id:
            parseFoodElectronicPaymentConfirmationId(
                value.id,
            ),
        version: validateFoodVersion(
            value.version,
        ),
        order: copyOrderSnapshot(
            value.order,
        ),
        evidence: copyEvidence(
            value.evidence,
        ),
    });
}

export function validateFoodElectronicPaymentConfirmationAgainstOrder(
    input: unknown,
    orderInput: unknown,
): FoodElectronicPaymentConfirmationVersion {
    const confirmation =
        validateFoodElectronicPaymentConfirmationVersion(
            input,
        );

    const order =
        validateFoodPhysicalOrderVersion(
            orderInput,
        );

    if (
        confirmation.order.id !== order.id ||
        confirmation.order.version !==
            order.version
    ) {
        throw new TypeError(
            "Electronic payment confirmation order mismatch",
        );
    }

    if (
        !moneyEqual(
            confirmation.order
                .merchandiseSubtotal,
            order.merchandiseSubtotal,
        )
    ) {
        throw new TypeError(
            "Electronic payment confirmation order subtotal snapshot mismatch",
        );
    }

    return confirmation;
}

export function createInitialFoodElectronicPaymentConfirmationVersion(
    identityInput: unknown,
    orderInput: unknown,
    evidenceInput: unknown,
): FoodElectronicPaymentConfirmationVersion {
    const identity = strictRecord(
        identityInput,
        ["id", "version"],
        "Invalid payment confirmation identity/version",
    );

    const order =
        validateFoodPhysicalOrderVersion(
            orderInput,
        );

    const version = validateFoodVersion(
        identity.version,
    );

    if (version !== 1) {
        throw new TypeError(
            "Initial electronic payment confirmation version must be one",
        );
    }

    const evidence =
        copyEvidence(
            evidenceInput,
        );

    return validateFoodElectronicPaymentConfirmationAgainstOrder(
        {
            id:
                parseFoodElectronicPaymentConfirmationId(
                    identity.id,
                ),
            version,
            order: {
                id: order.id,
                version: order.version,
                merchandiseSubtotal:
                    order.merchandiseSubtotal,
            },
            evidence,
        },
        order,
    );
}

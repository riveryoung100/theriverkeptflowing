export interface RiverCommerceProduct {
    productId: string;
    productVersion: string;
    productName: string;
    unitAmountUsdCents: number;
    checkoutPath: string;
    successPath: string;
    cancelPath: string;
    approvedReleaseId: string;
    deliverySubject: string;
    deliveryText: string;
}

function requireNormalizedProductValue(
    value: string,
    label: string,
): string {
    if (
        value.length === 0 ||
        value.trim() !== value
    ) {
        throw new Error(
            `${label} must be a non-empty normalized string.`,
        );
    }

    return value;
}

function requirePositiveWholeCents(
    value: number,
): number {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        throw new Error(
            "Product amount must be a positive whole-cent value.",
        );
    }

    return value;
}

export function createRiverCommerceProduct(
    input: RiverCommerceProduct,
): Readonly<RiverCommerceProduct> {
    return Object.freeze({
        productId:
            requireNormalizedProductValue(
                input.productId,
                "Product id",
            ),

        productVersion:
            requireNormalizedProductValue(
                input.productVersion,
                "Product version",
            ),

        productName:
            requireNormalizedProductValue(
                input.productName,
                "Product name",
            ),

        unitAmountUsdCents:
            requirePositiveWholeCents(
                input.unitAmountUsdCents,
            ),

        checkoutPath:
            requireNormalizedProductValue(
                input.checkoutPath,
                "Checkout path",
            ),

        successPath:
            requireNormalizedProductValue(
                input.successPath,
                "Success path",
            ),

        cancelPath:
            requireNormalizedProductValue(
                input.cancelPath,
                "Cancel path",
            ),

        approvedReleaseId:
            requireNormalizedProductValue(
                input.approvedReleaseId,
                "Approved release id",
            ),

        deliverySubject:
            requireNormalizedProductValue(
                input.deliverySubject,
                "Delivery subject",
            ),

        deliveryText:
            requireNormalizedProductValue(
                input.deliveryText,
                "Delivery text",
            ),
    });
}

export const RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT =
    createRiverCommerceProduct({
        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        productName:
            "River Life Operating System",

        unitAmountUsdCents:
            2900,

        checkoutPath:
            "/api/commerce/create-checkout",

        successPath:
            "/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}",

        cancelPath:
            "/shop?checkout=cancelled",

        approvedReleaseId:
            "product-001e-07-runtime-approved-001",

        deliverySubject:
            "Your River Life Operating System",

        deliveryText:
            "Thank you for your purchase. Your River Life Operating System is attached.",
    });

export const KNOW_YOUR_NUMBER_COMMERCE_PRODUCT =
    createRiverCommerceProduct({
        productId:
            "know-your-number",

        productVersion:
            "v1",

        productName:
            "Know Your Number",

        unitAmountUsdCents:
            4900,

        checkoutPath:
            "/api/commerce/create-checkout",

        successPath:
            "/shop/know-your-number?checkout=success&session_id={CHECKOUT_SESSION_ID}",

        cancelPath:
            "/shop/know-your-number?checkout=cancelled",

        approvedReleaseId:
            "know-your-number-v1-approved-001",

        deliverySubject:
            "Your Know Your Number Money Plan",

        deliveryText:
            "Thank you for your purchase. Your Know Your Number Money & Future Planning System is attached.",
    });

export function getRiverCommerceProduct(
    productId: string,
    productVersion: string,
): Readonly<RiverCommerceProduct> | undefined {
    if (
        productId ===
            RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productId &&
        productVersion ===
            RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productVersion
    ) {
        return RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT;
    }

    if (
        productId ===
            KNOW_YOUR_NUMBER_COMMERCE_PRODUCT.productId &&
        productVersion ===
            KNOW_YOUR_NUMBER_COMMERCE_PRODUCT.productVersion
    ) {
        return KNOW_YOUR_NUMBER_COMMERCE_PRODUCT;
    }

    return undefined;
}

export interface PurchaseCtaPublicationState {
    checkoutPublicationAuthorized: boolean;
}

export interface PublicPurchaseCta {
    label: string;
    checkoutEndpoint: string;
    productId: string;
    productVersion: string;
}

export const RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT =
    "/api/commerce/create-checkout";

export const CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE:
    Readonly<PurchaseCtaPublicationState> =
    Object.freeze({
        checkoutPublicationAuthorized: false,
    });

export const PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE:
    Readonly<PurchaseCtaPublicationState> =
    Object.freeze({
        checkoutPublicationAuthorized: true,
    });

export const PRODUCT_002O_KNOW_YOUR_NUMBER_SANDBOX_CHECKOUT_PUBLICATION_STATE:
    Readonly<PurchaseCtaPublicationState> =
    Object.freeze({
        checkoutPublicationAuthorized: true,
    });

export interface PublicPurchaseCtaProduct {
    productId: string;
    productVersion: string;
    productName: string;
    checkoutEndpoint: string;
}

function requireNormalizedPurchaseCtaValue(
    value: string,
    label: string
): string {
    if (
        value.length === 0 ||
        value.trim() !== value
    ) {
        throw new Error(
            `${label} must be a non-empty normalized string.`
        );
    }

    return value;
}

export function buildPublicProductPurchaseCta(
    publicationState:
        PurchaseCtaPublicationState,
    product:
        PublicPurchaseCtaProduct
): PublicPurchaseCta | null {

    if (
        !publicationState
            .checkoutPublicationAuthorized
    ) {
        return null;
    }

    const productName =
        requireNormalizedPurchaseCtaValue(
            product.productName,
            "Product name"
        );

    return {
        label:
            `Purchase ${productName}`,

        checkoutEndpoint:
            requireNormalizedPurchaseCtaValue(
                product.checkoutEndpoint,
                "Checkout endpoint"
            ),

        productId:
            requireNormalizedPurchaseCtaValue(
                product.productId,
                "Product id"
            ),

        productVersion:
            requireNormalizedPurchaseCtaValue(
                product.productVersion,
                "Product version"
            ),
    };
}

export function buildPublicPurchaseCta(
    publicationState:
        PurchaseCtaPublicationState
): PublicPurchaseCta | null {
    return buildPublicProductPurchaseCta(
        publicationState,
        {
            productId:
                "river-life-operating-system",

            productVersion:
                "v1",

            productName:
                "the River Life Operating System",

            checkoutEndpoint:
                RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT,
        }
    );
}

export interface PurchaseCtaPublicationState {
    checkoutPublicationAuthorized: boolean;
}

export interface PublicPurchaseCta {
    label: string;
    checkoutEndpoint: string;
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

export function buildPublicPurchaseCta(
    publicationState:
        PurchaseCtaPublicationState
): PublicPurchaseCta | null {

    if (
        !publicationState
            .checkoutPublicationAuthorized
    ) {
        return null;
    }

    return {
        label:
            "Purchase the River Life Operating System",

        checkoutEndpoint:
            RIVER_LIFE_OPERATING_SYSTEM_CHECKOUT_ENDPOINT,
    };
}
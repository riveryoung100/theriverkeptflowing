export const RIVER_LIFE_OPERATING_SYSTEM_PRODUCT_ID =
    "river-life-operating-system" as const;

export const RIVER_LIFE_OPERATING_SYSTEM_VERSION = "v1" as const;

export const RIVER_LIFE_OPERATING_SYSTEM_WORKING_PRICE_USD = 29 as const;

export interface ProductPublicationState {
    pricePublicationAuthorized: boolean;
    availabilityPublicationAuthorized: boolean;
    checkoutPublicationAuthorized: boolean;
    customerPurchaseAuthorized: boolean;
    publicLaunchAuthorized: boolean;
}

export const CLOSED_PRODUCT_PUBLICATION_STATE: Readonly<ProductPublicationState> =
    Object.freeze({
        pricePublicationAuthorized: false,
        availabilityPublicationAuthorized: false,
        checkoutPublicationAuthorized: false,
        customerPurchaseAuthorized: false,
        publicLaunchAuthorized: false,
    });

export interface ProductArchitectureSection {
    order: number;
    id: string;
    title: string;
}

export interface ProductPresentationContract {
    productId: typeof RIVER_LIFE_OPERATING_SYSTEM_PRODUCT_ID;
    productVersion: typeof RIVER_LIFE_OPERATING_SYSTEM_VERSION;
    productName: string;
    positioning: string;
    productType: string;
    intendedOutcome: string;
    architecture: readonly ProductArchitectureSection[];
    customerDeliverable: string;
    deliveryExpectation: string;
    paidValueBoundary: string;
    prohibitedClaims: readonly string[];
    publicationState: Readonly<ProductPublicationState>;
}

export const RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION:
    Readonly<ProductPresentationContract> = Object.freeze({
        productId: RIVER_LIFE_OPERATING_SYSTEM_PRODUCT_ID,
        productVersion: RIVER_LIFE_OPERATING_SYSTEM_VERSION,

        productName: "The River Life Operating System",

        positioning:
            "A practical system for building a life around what matters most.",

        productType: "digital-guided-life-planning-system",

        intendedOutcome:
            "Help a person examine the life they have inherited and built, identify what matters most, evaluate where their time, attention, responsibilities, relationships, work, money, habits, and ambitions are actually carrying them, and leave with a smaller set of deliberate priorities and next actions.",

        architecture: Object.freeze([
            Object.freeze({
                order: 1,
                id: "headwaters",
                title: "Headwaters",
            }),
            Object.freeze({
                order: 2,
                id: "source",
                title: "The Source",
            }),
            Object.freeze({
                order: 3,
                id: "tributaries",
                title: "Tributaries",
            }),
            Object.freeze({
                order: 4,
                id: "current",
                title: "The Current",
            }),
            Object.freeze({
                order: 5,
                id: "destination",
                title: "The Destination",
            }),
        ]),

        customerDeliverable:
            "The approved River Life Operating System v1 digital PDF release delivered through the governed transactional fulfillment path.",

        deliveryExpectation:
            "Digital delivery occurs through the governed transactional fulfillment path after verified payment.",

        paidValueBoundary:
            "Paid value is structured application and guided execution rather than merely republishing freely available River essays.",

        prohibitedClaims: Object.freeze([
            "invented testimonials",
            "invented customer results",
            "invented audience proof",
            "guaranteed outcomes",
            "unsupported coaching authority",
            "therapy claims",
            "medical advice claims",
            "legal advice claims",
            "financial advice claims",
            "professional certification claims",
        ]),

        publicationState: CLOSED_PRODUCT_PUBLICATION_STATE,
    });

export function isPublicCommerceAuthorized(
    state: ProductPublicationState,
): boolean {
    return (
        state.pricePublicationAuthorized === true &&
        state.availabilityPublicationAuthorized === true &&
        state.checkoutPublicationAuthorized === true &&
        state.customerPurchaseAuthorized === true &&
        state.publicLaunchAuthorized === true
    );
}

export function assertPublicCommerceAuthorized(
    state: ProductPublicationState,
): void {
    if (!isPublicCommerceAuthorized(state)) {
        throw new Error(
            "River Life Operating System public commerce is not authorized.",
        );
    }
}

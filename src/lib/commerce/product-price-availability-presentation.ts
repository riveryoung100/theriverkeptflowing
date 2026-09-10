export interface PriceAvailabilityPublicationState {
    pricePublicationAuthorized: boolean;
    availabilityPublicationAuthorized: boolean;
}

export const PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE:
    Readonly<PriceAvailabilityPublicationState> = Object.freeze({
        pricePublicationAuthorized: true,
        availabilityPublicationAuthorized: true,
    });
export const PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE:
    Readonly<PriceAvailabilityPublicationState> = Object.freeze({
        pricePublicationAuthorized: true,
        availabilityPublicationAuthorized: true,
    });

export interface PublicPriceAvailabilityInput {
    publicationState: PriceAvailabilityPublicationState;
    workingPriceUsd: number;
    digitallyDeliverable: boolean;
}

export interface PublicPriceAvailabilityPresentation {
    priceLabel: string | null;
    availabilityLabel: string | null;
}

function formatUsdPrice(amount: number): string {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error("Working product price must be a positive whole-dollar amount.");
    }

    return `$${amount}`;
}

export function buildPublicPriceAvailabilityPresentation(
    input: PublicPriceAvailabilityInput,
): PublicPriceAvailabilityPresentation {
    const {
        publicationState,
        workingPriceUsd,
        digitallyDeliverable,
    } = input;

    return {
        priceLabel: publicationState.pricePublicationAuthorized
            ? formatUsdPrice(workingPriceUsd)
            : null,

        availabilityLabel:
            publicationState.availabilityPublicationAuthorized
                ? digitallyDeliverable
                    ? "Available for digital delivery"
                    : "Not currently available"
                : null,
    };
}

export function hasPublicPriceAvailabilityPresentation(
    presentation: PublicPriceAvailabilityPresentation,
): boolean {
    return (
        presentation.priceLabel !== null ||
        presentation.availabilityLabel !== null
    );
}

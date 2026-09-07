export interface CustomerLaunchPathStage {
    id:
        | "presentation"
        | "checkout"
        | "verified-payment"
        | "persistence"
        | "fulfillment"
        | "recorded-delivery";

    authority:
        | "river-browser"
        | "river-server"
        | "stripe"
        | "river-runtime";
}

export interface CustomerLaunchReturnNotice {
    heading: string;
    message: string;
}

export const RIVER_LIFE_OPERATING_SYSTEM_CUSTOMER_LAUNCH_PATH:
    readonly CustomerLaunchPathStage[] =
    Object.freeze([
        {
            id: "presentation",
            authority: "river-browser",
        },
        {
            id: "checkout",
            authority: "stripe",
        },
        {
            id: "verified-payment",
            authority: "river-server",
        },
        {
            id: "persistence",
            authority: "river-runtime",
        },
        {
            id: "fulfillment",
            authority: "river-runtime",
        },
        {
            id: "recorded-delivery",
            authority: "river-runtime",
        },
    ]);

export function buildCustomerLaunchReturnNotice(
    checkoutState: string | null
): CustomerLaunchReturnNotice | null {

    if (checkoutState !== "success") {
        return null;
    }

    return {
        heading:
            "Checkout received.",

        message:
            "Your payment is verified server-side before fulfillment begins. If payment is confirmed, the River fulfillment path records the order and sends the approved digital release to the delivery email used at checkout.",
    };
}
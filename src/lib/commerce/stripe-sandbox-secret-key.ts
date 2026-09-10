export type StripeCheckoutMode =
    "test" |
    "live";


export function requireStripeCheckoutMode(
    value:
        unknown
): StripeCheckoutMode {

    if (
        value !== "test" &&
        value !== "live"
    ) {

        throw new Error(
            "Stripe checkout mode must be explicitly configured as test or live."
        );
    }

    return value;
}


export function requireStripeCheckoutSecretKey(
    value:
        unknown,
    mode:
        StripeCheckoutMode
): string {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            "Stripe checkout secret key is not configured."
        );
    }

    const requiredPrefix =
        mode === "live"
            ? "sk_live_"
            : "sk_test_";

    if (
        !value.startsWith(
            requiredPrefix
        ) ||
        value.length ===
            requiredPrefix.length
    ) {

        throw new Error(
            `Stripe ${mode} checkout requires a ${mode}-mode secret key.`
        );
    }

    return value;
}


export function requireStripeSandboxSecretKey(
    value:
        unknown
): string {

    return requireStripeCheckoutSecretKey(
        value,
        "test"
    );
}

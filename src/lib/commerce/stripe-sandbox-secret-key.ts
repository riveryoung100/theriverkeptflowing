export function requireStripeSandboxSecretKey(
    value:
        unknown
): string {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            "Stripe sandbox secret key is not configured."
        );
    }

    if (
        !value.startsWith(
            "sk_test_"
        ) ||
        value.length ===
            "sk_test_".length
    ) {

        throw new Error(
            "Stripe sandbox checkout requires a test-mode secret key."
        );
    }

    return value;
}
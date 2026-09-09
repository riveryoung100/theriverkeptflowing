export const RIVER_OS_SESSION_KEY =
    "river-os-authenticated";

export const RIVER_OS_SESSION_TTL_SECONDS =
    60 * 60 * 12;


export function readRiverOsAccessKey(
    runtimeEnvironment:
        Record<string, unknown>
): string {

    const value =
        runtimeEnvironment
            .RIVER_OS_ACCESS_KEY;

    if (
        typeof value !== "string" ||
        value.length < 16 ||
        value.trim() !== value
    ) {

        throw new Error(
            "RIVER_OS_ACCESS_KEY is not configured."
        );

    }

    return value;

}


async function digest(
    value:
        string
): Promise<Uint8Array> {

    const encoded =
        new TextEncoder()
            .encode(
                value
            );

    const result =
        await crypto.subtle.digest(
            "SHA-256",
            encoded
        );

    return new Uint8Array(
        result
    );

}


export async function riverOsAccessKeysMatch(
    submitted:
        string,
    configured:
        string
): Promise<boolean> {

    const [
        submittedDigest,
        configuredDigest
    ] =
        await Promise.all([
            digest(
                submitted
            ),
            digest(
                configured
            )
        ]);

    let difference =
        submittedDigest.length ^
        configuredDigest.length;

    const length =
        Math.max(
            submittedDigest.length,
            configuredDigest.length
        );

    for (
        let index = 0;
        index < length;
        index += 1
    ) {

        difference |=
            (
                submittedDigest[index] ??
                0
            ) ^
            (
                configuredDigest[index] ??
                0
            );

    }

    return difference === 0;

}


export function isRiverOsPath(
    pathname:
        string
): boolean {

    return (
        pathname === "/river-os" ||
        pathname.startsWith(
            "/river-os/"
        )
    );

}


export function isRiverOsPublicPath(
    pathname:
        string
): boolean {

    return (
        pathname ===
            "/river-os/login" ||
        pathname ===
            "/river-os/login/"
    );

}
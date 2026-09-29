function decodeBase64PublicKey(
    value: string
): Uint8Array<ArrayBuffer> {
    const trimmed =
        value.trim();

    if(
        trimmed.length === 0 ||
        trimmed.length % 4 === 1 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(
            trimmed
        )
    ){
        throw new TypeError(
            "Telnyx webhook public key must be valid Base64."
        );
    }

    let decoded:
        string;

    try {
        decoded =
            globalThis.atob(
                trimmed
            );
    }
    catch {
        throw new TypeError(
            "Telnyx webhook public key must be valid Base64."
        );
    }

    if(decoded.length !== 32){
        throw new TypeError(
            "Telnyx webhook public key must decode to 32 bytes."
        );
    }

    const bytes =
        new Uint8Array(
            new ArrayBuffer(
                decoded.length
            )
        );

    for(
        let index = 0;
        index < decoded.length;
        index += 1
    ){
        bytes[index] =
            decoded.charCodeAt(
                index
            );
    }

    return bytes;
}

export async function importTelnyxWebhookPublicKey(
    value: string
): Promise<CryptoKey> {
    return globalThis.crypto.subtle.importKey(
        "raw",
        decodeBase64PublicKey(
            value
        ),
        {
            name:
                "Ed25519"
        },
        false,
        [
            "verify"
        ]
    );
}

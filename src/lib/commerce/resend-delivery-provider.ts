import {
    assertDeliveryProviderRequest,
    assertDeliveryProviderResult,
    type DeliveryProvider,
    type DeliveryProviderRequest,
    type DeliveryProviderResult
} from "../fulfillment/delivery-provider";


type FetchFunction =
    (
        input:
            string,
        init:
            RequestInit
    ) => Promise<Response>;


export interface ResendDeliveryProviderOptions {

    readonly apiKey:
        string;

    readonly from:
        string;

    readonly fetcher?:
        FetchFunction;

    readonly now?:
        () => string;

}


function requireNormalized(
    value:
        string,
    label:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.length ===
            0 ||
        value.trim() !==
            value
    ) {

        throw new Error(
            `${label} must be a normalized non-empty string.`
        );

    }

    return value;

}


function encodeBase64(
    bytes:
        Uint8Array
): string {

    const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let result =
        "";

    for (
        let index =
            0;
        index <
            bytes.length;
        index +=
            3
    ) {

        const first =
            bytes[index];

        const second =
            index + 1 <
                bytes.length
                ? bytes[
                    index + 1
                ]
                : undefined;

        const third =
            index + 2 <
                bytes.length
                ? bytes[
                    index + 2
                ]
                : undefined;

        result +=
            alphabet[
                first >>
                    2
            ];

        result +=
            alphabet[
                (
                    (
                        first &
                        0x03
                    ) <<
                        4
                ) |
                (
                    second ===
                        undefined
                        ? 0
                        : second >>
                            4
                )
            ];

        result +=
            second ===
                undefined
                ? "="
                : alphabet[
                    (
                        (
                            second &
                            0x0f
                        ) <<
                            2
                    ) |
                    (
                        third ===
                            undefined
                            ? 0
                            : third >>
                                6
                    )
                ];

        result +=
            third ===
                undefined
                ? "="
                : alphabet[
                    third &
                        0x3f
                ];

    }

    return result;

}


function isRecord(
    value:
        unknown
): value is Record<string, unknown> {

    return (
        typeof value ===
            "object" &&
        value !==
            null &&
        !Array.isArray(
            value
        )
    );

}


export class ResendDeliveryProvider
implements DeliveryProvider {

    private readonly apiKey:
        string;

    private readonly from:
        string;

    private readonly fetcher:
        FetchFunction;

    private readonly now:
        () => string;


    public constructor(
        options:
            ResendDeliveryProviderOptions
    ) {

        this.apiKey =
            requireNormalized(
                options.apiKey,
                "Resend API key"
            );

        this.from =
            requireNormalized(
                options.from,
                "Resend from address"
            );

        const fetcher =
            options.fetcher ??
            fetch;

        this.fetcher =
            (input, init) =>
                fetcher(
                    input,
                    init
                );

        this.now =
            options.now ??
            (
                () =>
                    new Date()
                        .toISOString()
            );

    }


    public async send(
        request:
            DeliveryProviderRequest
    ): Promise<DeliveryProviderResult> {

        assertDeliveryProviderRequest(
            request
        );

        let response:
            Response;

        try {

            response =
                await this.fetcher(
                    "https://api.resend.com/emails",
                    {
                        method:
                            "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${this.apiKey}`,

                            "Content-Type":
                                "application/json",

                            "Idempotency-Key":
                                request.idempotencyKey
                        },

                        body:
                            JSON.stringify({
                                from:
                                    this.from,

                                to: [
                                    request.deliveryEmail
                                ],

                                subject:
                                    request.message.subject,

                                text:
                                    request.message.text,

                                attachments: [
                                    {
                                        filename:
                                            request.release.artifactFilename,

                                        content:
                                            encodeBase64(
                                                request.artifactBytes
                                            ),

                                        content_type:
                                            "application/pdf"
                                    }
                                ]
                            })
                    }
                );

        }
        catch (error) {

            const detail =
                error instanceof Error &&
                error.message.length > 0
                    ? error.message
                    : "Unknown transport exception.";

            const failed:
                DeliveryProviderResult =
            {
                status:
                    "failed",

                code:
                    "resend_transport_error",

                message:
                    `Resend delivery transport failed: ${detail}`,

                retryable:
                    true
            };

            assertDeliveryProviderResult(
                failed
            );

            return failed;

        }

        let responseBody:
            unknown;

        try {

            responseBody =
                await response.json();

        }
        catch {

            responseBody =
                undefined;

        }

        if (
            !response.ok
        ) {

            const failed:
                DeliveryProviderResult =
            {
                status:
                    "failed",

                code:
                    `resend_http_${response.status}`,

                message:
                    "Resend rejected the delivery request.",

                retryable:
                    response.status ===
                        429 ||
                    response.status >=
                        500
            };

            assertDeliveryProviderResult(
                failed
            );

            return failed;

        }

        if (
            !isRecord(
                responseBody
            ) ||
            typeof responseBody.id !==
                "string" ||
            responseBody.id.length ===
                0 ||
            responseBody.id.trim() !==
                responseBody.id
        ) {

            const failed:
                DeliveryProviderResult =
            {
                status:
                    "failed",

                code:
                    "resend_invalid_response",

                message:
                    "Resend returned invalid successful delivery evidence.",

                retryable:
                    true
            };

            assertDeliveryProviderResult(
                failed
            );

            return failed;

        }

        const sent:
            DeliveryProviderResult =
        {
            status:
                "sent",

            providerMessageReference:
                responseBody.id,

            acceptedAt:
                this.now()
        };

        assertDeliveryProviderResult(
            sent
        );

        return sent;

    }

}

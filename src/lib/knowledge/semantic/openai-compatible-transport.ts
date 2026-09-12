import type {
    SemanticModelTransport,
    SemanticModelTransportRequest,
    SemanticModelTransportResponse
} from "./model-provider";


export interface SemanticOpenAICompatibleTransportConfiguration {

    readonly endpoint:
        string;

    readonly model:
        string;

    readonly credential:
        string;

}


interface OpenAICompatibleResponseBody {

    readonly choices?: readonly {
        readonly message?: {
            readonly content?: unknown;
        };
    }[];

}


function requireNonEmptyString(
    value: string,
    name: string
): string {

    const normalized =
        value.trim();

    if (
        normalized.length ===
        0
    ) {
        throw new TypeError(
            `${name} is required.`
        );
    }

    return normalized;

}


function validateEndpoint(
    endpoint: string
): string {

    const normalized =
        requireNonEmptyString(
            endpoint,
            "Semantic model endpoint"
        );

    let parsed:
        URL;

    try {

        parsed =
            new URL(
                normalized
            );

    } catch {

        throw new TypeError(
            "Semantic model endpoint must be an absolute HTTP or HTTPS URL."
        );

    }

    if (
        parsed.protocol !==
            "https:" &&
        parsed.protocol !==
            "http:"
    ) {
        throw new TypeError(
            "Semantic model endpoint must use HTTP or HTTPS."
        );
    }

    if (
        parsed.protocol ===
        "http:"
    ) {

        const loopbackHosts =
            new Set([
                "localhost",
                "127.0.0.1",
                "[::1]",
                "[0000:0000:0000:0000:0000:0000:0000:0001]"
            ]);

        if (
            !loopbackHosts.has(
                parsed.hostname.toLowerCase()
            )
        ) {
            throw new TypeError(
                "Remote semantic model endpoints must use HTTPS; HTTP is allowed only for explicit loopback-local endpoints."
            );
        }

    }

    return parsed.toString();

}


export function createSemanticOpenAICompatibleTransport(
    configuration: SemanticOpenAICompatibleTransportConfiguration,
    fetchImplementation: typeof fetch = fetch
): SemanticModelTransport {

    const endpoint =
        validateEndpoint(
            configuration.endpoint
        );

    const model =
        requireNonEmptyString(
            configuration.model,
            "Semantic model identifier"
        );

    const credential =
        requireNonEmptyString(
            configuration.credential,
            "Semantic model credential"
        );

    return async (
        request: SemanticModelTransportRequest
    ): Promise<SemanticModelTransportResponse> => {

        const system =
            requireNonEmptyString(
                request.system,
                "Semantic model system instruction"
            );

        const user =
            requireNonEmptyString(
                request.user,
                "Semantic model user instruction"
            );

        const response =
            await fetchImplementation(
                endpoint,
                {
                    method:
                        "POST",
                    headers: {
                        "content-type":
                            "application/json",
                        authorization:
                            `Bearer ${credential}`
                    },
                    body:
                        JSON.stringify({
                            model,
                            messages: [
                                {
                                    role:
                                        "system",
                                    content:
                                        system
                                },
                                {
                                    role:
                                        "user",
                                    content:
                                        user
                                }
                            ],
                            temperature:
                                0
                        })
                }
            );

        if (
            !response.ok
        ) {
            throw new TypeError(
                `Semantic model transport request failed with HTTP ${response.status}.`
            );
        }

        let body:
            OpenAICompatibleResponseBody;

        try {

            body =
                await response.json() as
                    OpenAICompatibleResponseBody;

        } catch {

            throw new TypeError(
                "Semantic model transport response was not valid JSON."
            );

        }

        const content =
            body.choices?.[0]?.message?.content;

        if (
            typeof content !==
                "string" ||
            content.trim().length ===
                0
        ) {
            throw new TypeError(
                "Semantic model transport response did not contain usable candidate content."
            );
        }

        return {
            content
        };

    };

}

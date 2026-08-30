export interface RiverDevOpenAICompatibleTransportConfiguration {
    readonly endpoint: string;
    readonly model: string;
    readonly credential: string;
}

export interface RiverDevOpenAICompatibleTransportRequest {
    readonly system: string;
    readonly user: string;
}

export interface RiverDevOpenAICompatibleTransportResponse {
    readonly content: string;
}

export type RiverDevModelTransport =
    (
        request: RiverDevOpenAICompatibleTransportRequest
    ) => Promise<RiverDevOpenAICompatibleTransportResponse>;

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
    const normalized = value.trim();

    if (normalized.length === 0) {
        throw new TypeError(`${name} is required.`);
    }

    return normalized;
}

function validateEndpoint(
    endpoint: string
): string {
    const normalized =
        requireNonEmptyString(
            endpoint,
            "Model endpoint"
        );

    let parsed: URL;

    try {
        parsed =
            new URL(
                normalized
            );
    } catch {
        throw new TypeError(
            "Model endpoint must be an absolute HTTP or HTTPS URL."
        );
    }

    if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
    ) {
        throw new TypeError(
            "Model endpoint must use HTTP or HTTPS."
        );
    }

    return parsed.toString();
}

export function createOpenAICompatibleTransport(
    configuration: RiverDevOpenAICompatibleTransportConfiguration,
    fetchImplementation: typeof fetch = fetch
): RiverDevModelTransport {
    const endpoint =
        validateEndpoint(
            configuration.endpoint
        );

    const model =
        requireNonEmptyString(
            configuration.model,
            "Model identifier"
        );

    const credential =
        requireNonEmptyString(
            configuration.credential,
            "Model credential"
        );

    return async (
        request:
            RiverDevOpenAICompatibleTransportRequest
    ): Promise<RiverDevOpenAICompatibleTransportResponse> => {
        const system =
            requireNonEmptyString(
                request.system,
                "Model system instruction"
            );

        const user =
            requireNonEmptyString(
                request.user,
                "Model user instruction"
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

        if (!response.ok) {
            throw new TypeError(
                `Model transport request failed with HTTP ${response.status}.`
            );
        }

        const body =
            await response.json() as
                OpenAICompatibleResponseBody;

        const content =
            body.choices?.[0]?.message?.content;

        if (
            typeof content !== "string" ||
            content.trim().length === 0
        ) {
            throw new TypeError(
                "Model transport response did not contain usable candidate content."
            );
        }

        return {
            content
        };
    };
}
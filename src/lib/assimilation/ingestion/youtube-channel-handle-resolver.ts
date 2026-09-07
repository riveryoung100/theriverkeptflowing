type FetchFunction =
    (
        input:
            string,
        init?:
            RequestInit
    ) => Promise<Response>;


export interface YouTubeChannelHandleResolverOptions {

    readonly apiKey:
        string;

    readonly endpoint?:
        string;

    readonly fetcher?:
        FetchFunction;

}


export interface YouTubeResolvedChannel {

    readonly handle:
        string;

    readonly channelId:
        string;

}


interface YouTubeChannelsResponse {

    readonly items?:
        readonly {
            readonly id?:
                string;
        }[];

}


function requireNormalized(
    value:
        string,
    label:
        string
): string {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new TypeError(
            `${label} must be a normalized non-empty string.`
        );

    }

    return value;

}


function normalizeHandle(
    value:
        string
): string {

    const handle =
        requireNormalized(
            value,
            "YouTube channel handle"
        );

    const normalized =
        handle.startsWith("@")
            ? handle
            : `@${handle}`;

    if (
        normalized.length <= 1 ||
        /\s/.test(
            normalized
        )
    ) {

        throw new TypeError(
            "YouTube channel handle is invalid."
        );

    }

    return normalized;

}


function requireHttpsEndpoint(
    value:
        string
): string {

    let parsed:
        URL;

    try {

        parsed =
            new URL(
                value
            );

    } catch {

        throw new TypeError(
            "YouTube channel resolution endpoint must be a valid HTTPS URL."
        );

    }

    if (
        parsed.protocol !==
        "https:"
    ) {

        throw new TypeError(
            "YouTube channel resolution endpoint must use HTTPS."
        );

    }

    return parsed.toString();

}


function isRecord(
    value:
        unknown
): value is Record<string, unknown> {

    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(
            value
        )
    );

}


function parseResponse(
    value:
        unknown
): YouTubeChannelsResponse {

    if (!isRecord(value)) {

        throw new TypeError(
            "YouTube channel resolution returned an invalid response body."
        );

    }

    if (
        value.items !== undefined &&
        !Array.isArray(
            value.items
        )
    ) {

        throw new TypeError(
            "YouTube channel resolution items must be an array."
        );

    }

    return value as
        unknown as YouTubeChannelsResponse;

}


export class YouTubeChannelHandleResolver {

    private readonly apiKey:
        string;

    private readonly endpoint:
        string;

    private readonly fetcher:
        FetchFunction;


    public constructor(
        options:
            YouTubeChannelHandleResolverOptions
    ) {

        this.apiKey =
            requireNormalized(
                options.apiKey,
                "YouTube API key"
            );

        this.endpoint =
            requireHttpsEndpoint(
                options.endpoint ??
                "https://www.googleapis.com/youtube/v3/channels"
            );

        const fetcher =
            options.fetcher ??
            fetch;

        this.fetcher =
            (
                input,
                init
            ) =>
                fetcher(
                    input,
                    init
                );

    }


    public async resolve(
        handle:
            string
    ): Promise<YouTubeResolvedChannel> {

        const normalizedHandle =
            normalizeHandle(
                handle
            );

        const url =
            new URL(
                this.endpoint
            );

        url.searchParams.set(
            "part",
            "id"
        );

        url.searchParams.set(
            "forHandle",
            normalizedHandle
        );

        url.searchParams.set(
            "key",
            this.apiKey
        );

        let response:
            Response;

        try {

            response =
                await this.fetcher(
                    url.toString(),
                    {
                        method:
                            "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

        } catch {

            throw new Error(
                "YouTube channel resolution transport failed."
            );

        }

        if (!response.ok) {

            throw new Error(
                `YouTube channel resolution request failed with HTTP ${response.status}.`
            );

        }

        let body:
            unknown;

        try {

            body =
                await response.json();

        } catch {

            throw new TypeError(
                "YouTube channel resolution returned malformed JSON."
            );

        }

        const parsed =
            parseResponse(
                body
            );

        if (
            !parsed.items ||
            parsed.items.length !== 1
        ) {

            throw new Error(
                "YouTube channel handle did not resolve to exactly one channel."
            );

        }

        const channelId =
            parsed.items[0]?.id;

        if (
            typeof channelId !== "string" ||
            channelId.trim().length === 0
        ) {

            throw new TypeError(
                "YouTube channel resolution returned an invalid channel ID."
            );

        }

        return {
            handle:
                normalizedHandle,

            channelId
        };

    }

}


export function createYouTubeChannelHandleResolver(
    options:
        YouTubeChannelHandleResolverOptions
): YouTubeChannelHandleResolver {

    return new YouTubeChannelHandleResolver(
        options
    );

}

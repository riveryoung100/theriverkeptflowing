import type {
    ContentSourceDiscoveryProvider,
    ContentSourceDiscoveryQuery,
    ContentSourceDiscoveryResult
} from "./content-source-discovery-provider";

type FetchFunction =
    (
        input:
            string,
        init?:
            RequestInit
    ) => Promise<Response>;

export interface YouTubeContentSourceVideoProviderOptions {

    readonly apiKey:
        string;

    readonly videoId:
        string;

    readonly endpoint?:
        string;

    readonly fetcher?:
        FetchFunction;

    readonly now?:
        () => string;

}

interface YouTubeVideoItem {

    readonly id?:
        string;

    readonly snippet?: {

        readonly publishedAt?:
            string;

        readonly channelId?:
            string;

        readonly title?:
            string;

        readonly description?:
            string;

    };

}

interface YouTubeVideoResponse {

    readonly items?:
        readonly YouTubeVideoItem[];

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

function requireHttpsEndpoint(
    value:
        string
): string {

    const normalized =
        requireNormalized(
            value,
            "YouTube video endpoint"
        );

    let url:
        URL;

    try {

        url =
            new URL(
                normalized
            );

    } catch {

        throw new TypeError(
            "YouTube video endpoint must be a valid HTTPS URL."
        );

    }

    if (
        url.protocol !==
        "https:"
    ) {

        throw new TypeError(
            "YouTube video endpoint must use HTTPS."
        );

    }

    return normalized;

}

function parseYouTubeVideoResponse(
    value:
        unknown
): YouTubeVideoResponse {

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            "YouTube video lookup response must be an object."
        );

    }

    const record =
        value as
            Record<string, unknown>;

    if (
        record.items !== undefined &&
        !Array.isArray(
            record.items
        )
    ) {

        throw new TypeError(
            "YouTube video lookup response items must be an array."
        );

    }

    return value as
        YouTubeVideoResponse;

}

export class YouTubeContentSourceVideoProvider
implements ContentSourceDiscoveryProvider {

    public readonly platform =
        "youtube" as const;

    private readonly apiKey:
        string;

    private readonly videoId:
        string;

    private readonly endpoint:
        string;

    private readonly fetcher:
        FetchFunction;

    private readonly now:
        () => string;

    public constructor(
        options:
            YouTubeContentSourceVideoProviderOptions
    ) {

        this.apiKey =
            requireNormalized(
                options.apiKey,
                "YouTube API key"
            );

        this.videoId =
            requireNormalized(
                options.videoId,
                "YouTube video identifier"
            );

        this.endpoint =
            requireHttpsEndpoint(
                options.endpoint ??
                "https://www.googleapis.com/youtube/v3/videos"
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

        this.now =
            options.now ??
            (
                () =>
                    new Date()
                        .toISOString()
            );

    }

    public async discover(
        query:
            ContentSourceDiscoveryQuery
    ): Promise<ContentSourceDiscoveryResult> {

        if (
            query.platform !==
            "youtube"
        ) {

            throw new TypeError(
                "YouTube video provider only accepts YouTube discovery queries."
            );

        }

        const url =
            new URL(
                this.endpoint
            );

        url.searchParams.set(
            "part",
            "snippet"
        );

        url.searchParams.set(
            "id",
            this.videoId
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
                "YouTube video lookup transport failed."
            );

        }

        if (!response.ok) {

            throw new Error(
                `YouTube video lookup request failed with HTTP ${response.status}.`
            );

        }

        let body:
            unknown;

        try {

            body =
                await response.json();

        } catch {

            throw new TypeError(
                "YouTube video lookup returned malformed JSON."
            );

        }

        const parsed =
            parseYouTubeVideoResponse(
                body
            );

        const item =
            parsed.items?.[0];

        if (!item) {

            throw new Error(
                "Requested YouTube video was not found."
            );

        }

        const id =
            requireNormalized(
                item.id ?? "",
                "YouTube video response identifier"
            );

        if (
            id !==
            this.videoId
        ) {

            throw new Error(
                "YouTube video lookup returned an unexpected video identifier."
            );

        }

        if (
            item.snippet?.channelId !==
            query.publisherId
        ) {

            throw new Error(
                "YouTube video does not belong to the resolved channel."
            );

        }

        const publishedAt =
            requireNormalized(
                item.snippet?.publishedAt ?? "",
                "YouTube video publishedAt"
            );

        if (
            !Number.isFinite(
                Date.parse(
                    publishedAt
                )
            )
        ) {

            throw new TypeError(
                "YouTube video publishedAt must be a valid timestamp."
            );

        }

        const title =
            requireNormalized(
                item.snippet?.title ?? "",
                "YouTube video title"
            );

        return {
            platform:
                "youtube",

            sources: [
                {
                    providerRecordId:
                        `youtube:${id}`,

                    discoveredAt:
                        this.now(),

                    source: {
                        platform:
                            "youtube",

                        url:
                            `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,

                        externalPlatformId:
                            id,

                        title,

                        ...(
                            typeof item.snippet?.description === "string" &&
                            item.snippet.description.trim().length > 0
                                ? {
                                    description:
                                        item.snippet.description
                                }
                                : {}
                        ),

                        publishedAt
                    },

                    providerMetadata: {
                        id,
                        snippet:
                            item.snippet ?? null
                    }
                }
            ]
        };

    }

}

export function createYouTubeContentSourceVideoProvider(
    options:
        YouTubeContentSourceVideoProviderOptions
): ContentSourceDiscoveryProvider {

    return new YouTubeContentSourceVideoProvider(
        options
    );

}

import type {
    ContentSourceDiscoveryProvider,
    ContentSourceDiscoveryQuery,
    ContentSourceDiscoveryResult,
    DiscoveredPublishedContentSource
} from "./content-source-discovery-provider";


type FetchFunction =
    (
        input:
            string,
        init?:
            RequestInit
    ) => Promise<Response>;


export interface YouTubeContentSourceDiscoveryProviderOptions {

    readonly apiKey:
        string;

    readonly endpoint?:
        string;

    readonly fetcher?:
        FetchFunction;

    readonly now?:
        () => string;

}


interface YouTubeSearchItem {

    readonly id?: {
        readonly kind?:
            string;

        readonly videoId?:
            string;
    };

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


interface YouTubeSearchResponse {

    readonly nextPageToken?:
        string;

    readonly items?:
        readonly YouTubeSearchItem[];

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

    let parsed:
        URL;

    try {

        parsed =
            new URL(
                value
            );

    } catch {

        throw new TypeError(
            "YouTube discovery endpoint must be a valid HTTPS URL."
        );

    }

    if (
        parsed.protocol !==
        "https:"
    ) {

        throw new TypeError(
            "YouTube discovery endpoint must use HTTPS."
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


function parseYouTubeSearchResponse(
    value:
        unknown
): YouTubeSearchResponse {

    if (!isRecord(value)) {

        throw new TypeError(
            "YouTube discovery returned an invalid response body."
        );

    }

    if (
        value.items !== undefined &&
        !Array.isArray(
            value.items
        )
    ) {

        throw new TypeError(
            "YouTube discovery response items must be an array."
        );

    }

    if (
        value.nextPageToken !== undefined &&
        (
            typeof value.nextPageToken !== "string" ||
            value.nextPageToken.trim().length === 0
        )
    ) {

        throw new TypeError(
            "YouTube discovery response nextPageToken is invalid."
        );

    }

    return value as
        unknown as YouTubeSearchResponse;

}


function parseSearchItem(
    item:
        YouTubeSearchItem,
    discoveredAt:
        string
): DiscoveredPublishedContentSource {

    const videoId =
        item.id?.videoId;

    const publishedAt =
        item.snippet?.publishedAt;

    const title =
        item.snippet?.title;

    if (
        typeof videoId !== "string" ||
        videoId.trim().length === 0
    ) {

        throw new TypeError(
            "YouTube discovery item is missing a video identifier."
        );

    }

    if (
        typeof publishedAt !== "string" ||
        !Number.isFinite(
            Date.parse(
                publishedAt
            )
        )
    ) {

        throw new TypeError(
            "YouTube discovery item is missing a valid published timestamp."
        );

    }

    if (
        typeof title !== "string" ||
        title.trim().length === 0
    ) {

        throw new TypeError(
            "YouTube discovery item is missing a title."
        );

    }

    return {
        providerRecordId:
            `youtube:${videoId}`,

        discoveredAt,

        source: {
            platform:
                "youtube",

            url:
                `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,

            externalPlatformId:
                videoId,

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
            id:
                item.id ?? null,

            snippet:
                item.snippet ?? null
        }
    };

}


export class YouTubeContentSourceDiscoveryProvider
implements ContentSourceDiscoveryProvider {

    public readonly platform =
        "youtube" as const;

    private readonly apiKey:
        string;

    private readonly endpoint:
        string;

    private readonly fetcher:
        FetchFunction;

    private readonly now:
        () => string;


    public constructor(
        options:
            YouTubeContentSourceDiscoveryProviderOptions
    ) {

        this.apiKey =
            requireNormalized(
                options.apiKey,
                "YouTube API key"
            );

        this.endpoint =
            requireHttpsEndpoint(
                options.endpoint ??
                "https://www.googleapis.com/youtube/v3/search"
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
                "YouTube discovery provider only accepts YouTube discovery queries."
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
            "type",
            "video"
        );

        url.searchParams.set(
            "order",
            "date"
        );

        url.searchParams.set(
            "channelId",
            query.publisherId
        );

        url.searchParams.set(
            "maxResults",
            String(
                query.limit ??
                25
            )
        );

        if (query.cursor) {

            url.searchParams.set(
                "pageToken",
                query.cursor
            );

        }

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
                "YouTube discovery transport failed."
            );

        }

        if (!response.ok) {

            throw new Error(
                `YouTube discovery request failed with HTTP ${response.status}.`
            );

        }

        let body:
            unknown;

        try {

            body =
                await response.json();

        } catch {

            throw new TypeError(
                "YouTube discovery returned malformed JSON."
            );

        }

        const parsed =
            parseYouTubeSearchResponse(
                body
            );

        const discoveredAt =
            this.now();

        const sources =
            (
                parsed.items ??
                []
            )
                .map(
                    (item) =>
                        parseSearchItem(
                            item,
                            discoveredAt
                        )
                );

        return {
            platform:
                "youtube",

            sources,

            ...(
                parsed.nextPageToken
                    ? {
                        nextCursor:
                            parsed.nextPageToken
                    }
                    : {}
            )
        };

    }

}


export function createYouTubeContentSourceDiscoveryProvider(
    options:
        YouTubeContentSourceDiscoveryProviderOptions
): ContentSourceDiscoveryProvider {

    return new YouTubeContentSourceDiscoveryProvider(
        options
    );

}

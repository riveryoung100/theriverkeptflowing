import type {
    ContentTranscriptAcquisitionProvider,
    ContentTranscriptAcquisitionRequest,
    ContentTranscriptAcquisitionResult
} from "./content-transcript-acquisition-provider";


type FetchFunction =
    (
        input:
            string,
        init?:
            RequestInit
    ) => Promise<Response>;


export interface YouTubeTranscriptProviderOptions {

    readonly watchEndpoint?:
        string;

    readonly fetcher?:
        FetchFunction;

    readonly now?:
        () => string;

}


interface YouTubeCaptionTrack {

    readonly baseUrl?:
        string;

    readonly languageCode?:
        string;

    readonly kind?:
        string;

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
        value.trim() !==
            value
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
            "YouTube transcript watch endpoint"
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
            "YouTube transcript watch endpoint must be a valid HTTPS URL."
        );

    }

    if (
        url.protocol !==
        "https:"
    ) {

        throw new TypeError(
            "YouTube transcript watch endpoint must use HTTPS."
        );

    }

    return normalized;

}


function decodeHtmlEntities(
    value:
        string
): string {

    return value
        .replace(
            /&#(\d+);/g,
            (
                _match,
                decimal:
                    string
            ) =>
                String.fromCodePoint(
                    Number(
                        decimal
                    )
                )
        )
        .replace(
            /&#x([0-9a-f]+);/gi,
            (
                _match,
                hexadecimal:
                    string
            ) =>
                String.fromCodePoint(
                    Number.parseInt(
                        hexadecimal,
                        16
                    )
                )
        )
        .replace(
            /&quot;/g,
            '"'
        )
        .replace(
            /&apos;/g,
            "'"
        )
        .replace(
            /&#39;/g,
            "'"
        )
        .replace(
            /&amp;/g,
            "&"
        )
        .replace(
            /&lt;/g,
            "<"
        )
        .replace(
            /&gt;/g,
            ">"
        );

}


function extractCaptionTracks(
    html:
        string
): readonly YouTubeCaptionTrack[] {

    const marker =
        '"captionTracks":';

    const markerIndex =
        html.indexOf(
            marker
        );

    if (
        markerIndex <
        0
    ) {

        throw new Error(
            "YouTube transcript captions are unavailable for this video."
        );

    }

    const arrayStart =
        html.indexOf(
            "[",
            markerIndex +
                marker.length
        );

    if (
        arrayStart <
        0
    ) {

        throw new TypeError(
            "YouTube transcript caption metadata is malformed."
        );

    }

    let inString =
        false;

    let escaped =
        false;

    let depth =
        0;

    for (
        let index =
            arrayStart;
        index <
            html.length;
        index +=
            1
    ) {

        const character =
            html[index];

        if (
            inString
        ) {

            if (
                escaped
            ) {

                escaped =
                    false;

            } else if (
                character ===
                "\\"
            ) {

                escaped =
                    true;

            } else if (
                character ===
                '"'
            ) {

                inString =
                    false;

            }

            continue;

        }

        if (
            character ===
            '"'
        ) {

            inString =
                true;

            continue;

        }

        if (
            character ===
            "["
        ) {

            depth +=
                1;

            continue;

        }

        if (
            character ===
            "]"
        ) {

            depth -=
                1;

            if (
                depth ===
                0
            ) {

                const serialized =
                    html.slice(
                        arrayStart,
                        index +
                            1
                    );

                let parsed:
                    unknown;

                try {

                    parsed =
                        JSON.parse(
                            serialized
                        );

                } catch {

                    throw new TypeError(
                        "YouTube transcript caption metadata contains malformed JSON."
                    );

                }

                if (
                    !Array.isArray(
                        parsed
                    )
                ) {

                    throw new TypeError(
                        "YouTube transcript caption metadata must be an array."
                    );

                }

                return parsed as
                    readonly YouTubeCaptionTrack[];

            }

        }

    }

    throw new TypeError(
        "YouTube transcript caption metadata is incomplete."
    );

}


function selectCaptionTrack(
    tracks:
        readonly YouTubeCaptionTrack[],
    preferredLanguage:
        string | undefined
): YouTubeCaptionTrack {

    const usable =
        tracks.filter(
            (
                track
            ) =>
                typeof track.baseUrl ===
                    "string" &&
                track.baseUrl.trim().length >
                    0
        );

    if (
        usable.length ===
        0
    ) {

        throw new Error(
            "YouTube transcript captions are unavailable for this video."
        );

    }

    if (
        preferredLanguage
    ) {

        const preferred =
            usable.find(
                (
                    track
                ) =>
                    track.languageCode ===
                        preferredLanguage
            );

        if (
            preferred
        ) {

            return preferred;

        }

    }

    const manual =
        usable.find(
            (
                track
            ) =>
                track.kind !==
                    "asr"
        );

    return (
        manual ??
        usable[0]!
    );

}


function normalizeTranscriptText(
    value:
        string
): string {

    return decodeHtmlEntities(
        value.replace(
            /<[^>]+>/g,
            ""
        )
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


function parseJson3TimedText(
    body:
        string
): string | null {

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                body
            );

    } catch {

        return null;

    }

    if (
        typeof parsed !==
            "object" ||
        parsed ===
            null ||
        !Array.isArray(
            (
                parsed as {
                    events?:
                        unknown;
                }
            ).events
        )
    ) {

        return null;

    }

    const segments:
        string[] =
        [];

    for (
        const event of
        (
            parsed as {
                events:
                    unknown[];
            }
        ).events
    ) {

        if (
            typeof event !==
                "object" ||
            event ===
                null ||
            !Array.isArray(
                (
                    event as {
                        segs?:
                            unknown;
                    }
                ).segs
            )
        ) {

            continue;

        }

        for (
            const segment of
            (
                event as {
                    segs:
                        unknown[];
                }
            ).segs
        ) {

            if (
                typeof segment !==
                    "object" ||
                segment ===
                    null ||
                typeof (
                    segment as {
                        utf8?:
                            unknown;
                    }
                ).utf8 !==
                    "string"
            ) {

                continue;

            }

            const normalized =
                normalizeTranscriptText(
                    (
                        segment as {
                            utf8:
                                string;
                        }
                    ).utf8
                );

            if (
                normalized.length >
                0
            ) {

                segments.push(
                    normalized
                );

            }

        }

    }

    const transcript =
        segments
            .join(
                " "
            )
            .trim();

    return transcript.length >
        0
        ? transcript
        : null;

}


function describeTimedTextResponse(
    body:
        string,
    contentType?:
        string
): string {

    const normalizedContentType =
        typeof contentType ===
            "string" &&
        contentType.trim().length >
            0
            ? contentType
                .split(
                    ";"
                )[0]!
                .trim()
                .toLowerCase()
            : "unknown";

    const trimmed =
        body.trim();

    let shape =
        "other";

    if (
        trimmed.length ===
        0
    ) {

        shape =
            "empty";

    } else if (
        trimmed.startsWith(
            "{"
        ) ||
        trimmed.startsWith(
            "["
        )
    ) {

        shape =
            "json-like";

    } else if (
        /^<!doctype\s+html\b|^<html\b/i.test(
            trimmed
        )
    ) {

        shape =
            "html-like";

    } else if (
        /^<\?xml\b|^<(transcript|timedtext|body|text|p)\b/i.test(
            trimmed
        )
    ) {

        shape =
            "xml-like";

    }

    return `contentType=${normalizedContentType}, bodyLength=${body.length}, shape=${shape}`;

}


function parseTimedText(
    body:
        string,
    contentType?:
        string
): string {

    const json3Transcript =
        parseJson3TimedText(
            body
        );

    if (
        json3Transcript
    ) {

        return json3Transcript;

    }

    const segments:
        string[] =
        [];

    const pattern =
        /<(text|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;

    let match:
        RegExpExecArray | null;

    while (
        (
            match =
                pattern.exec(
                    body
                )
        ) !==
        null
    ) {

        const decoded =
            normalizeTranscriptText(
                match[2]!
            );

        if (
            decoded.length >
            0
        ) {

            segments.push(
                decoded
            );

        }

    }

    const transcript =
        segments
            .join(
                " "
            )
            .trim();

    if (
        transcript.length ===
        0
    ) {

        throw new Error(
            `YouTube transcript response contained no transcript text (${describeTimedTextResponse(
                body,
                contentType
            )}).`
        );

    }

    return transcript;

}


export class YouTubeTranscriptProvider
implements ContentTranscriptAcquisitionProvider {

    public readonly platform =
        "youtube" as const;

    private readonly watchEndpoint:
        string;

    private readonly fetcher:
        FetchFunction;

    private readonly now:
        () => string;


    public constructor(
        options:
            YouTubeTranscriptProviderOptions = {}
    ) {

        this.watchEndpoint =
            requireHttpsEndpoint(
                options.watchEndpoint ??
                "https://www.youtube.com/watch"
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


    public async acquire(
        request:
            ContentTranscriptAcquisitionRequest
    ): Promise<ContentTranscriptAcquisitionResult> {

        if (
            request.source.platform !==
            "youtube"
        ) {

            throw new TypeError(
                "YouTube transcript provider only accepts YouTube canonical sources."
            );

        }

        const videoId =
            requireNormalized(
                request.source.externalPlatformId,
                "YouTube transcript video identifier"
            );

        const watchUrl =
            new URL(
                this.watchEndpoint
            );

        watchUrl.searchParams.set(
            "v",
            videoId
        );

        let watchResponse:
            Response;

        try {

            watchResponse =
                await this.fetcher(
                    watchUrl.toString(),
                    {
                        method:
                            "GET",
                        headers: {
                            "Accept":
                                "text/html"
                        }
                    }
                );

        } catch {

            throw new Error(
                "YouTube transcript watch-page transport failed."
            );

        }

        if (
            !watchResponse.ok
        ) {

            throw new Error(
                `YouTube transcript watch-page request failed with HTTP ${watchResponse.status}.`
            );

        }

        const html =
            await watchResponse.text();

        const track =
            selectCaptionTrack(
                extractCaptionTracks(
                    html
                ),
                request.preferredLanguage
            );

        const captionUrl =
            new URL(
                requireHttpsEndpoint(
                    requireNormalized(
                        track.baseUrl ?? "",
                        "YouTube transcript caption endpoint"
                    )
                )
            );

        captionUrl.searchParams.set(
            "fmt",
            "json3"
        );

        let captionResponse:
            Response;

        try {

            captionResponse =
                await this.fetcher(
                    captionUrl.toString(),
                    {
                        method:
                            "GET",
                        headers: {
                            "Accept":
                                "application/json,text/xml,application/xml"
                        }
                    }
                );

        } catch {

            throw new Error(
                "YouTube transcript caption transport failed."
            );

        }

        if (
            !captionResponse.ok
        ) {

            throw new Error(
                `YouTube transcript caption request failed with HTTP ${captionResponse.status}.`
            );

        }

        const captionBody =
            await captionResponse.text();

        let text:
            string;

        try {

            text =
                parseTimedText(
                    captionBody,
                    captionResponse.headers.get(
                        "content-type"
                    ) ??
                        undefined
                );

        } catch (
            error
        ) {

            if (
                !(
                    error instanceof
                        Error
                ) ||
                !error.message.startsWith(
                    "YouTube transcript response contained no transcript text ("
                )
            ) {

                throw error;

            }

            let fallbackResponse:
                Response;

            try {

                fallbackResponse =
                    await this.fetcher(
                        requireHttpsEndpoint(
                            requireNormalized(
                                track.baseUrl ?? "",
                                "YouTube transcript caption endpoint"
                            )
                        ),
                        {
                            method:
                                "GET",
                            headers: {
                                "Accept":
                                    "text/xml,application/xml,application/json"
                            }
                        }
                    );

            } catch (
                error
            ) {

                throw new Error(
                    "YouTube transcript caption fallback transport failed.",
                    {
                        cause:
                            error
                    }
                );

            }

            if (
                !fallbackResponse.ok
            ) {

                throw new Error(
                    `YouTube transcript caption fallback request failed with HTTP ${fallbackResponse.status}.`,
                    {
                        cause:
                            error
                    }
                );

            }

            const fallbackBody =
                await fallbackResponse.text();

            text =
                parseTimedText(
                    fallbackBody,
                    fallbackResponse.headers.get(
                        "content-type"
                    ) ??
                        undefined
                );

        }

        return {
            sourceId:
                request.source.sourceId,

            platform:
                "youtube",

            transcript: {
                text,

                provenance: {
                    type:
                        "platform",

                    provider:
                        "youtube",

                    ...(
                        typeof track.languageCode ===
                            "string" &&
                        track.languageCode.trim().length >
                            0
                            ? {
                                language:
                                    track.languageCode
                            }
                            : {}
                    ),

                    capturedAt:
                        this.now()
                }
            }
        };

    }

}


export function createYouTubeTranscriptProvider(
    options:
        YouTubeTranscriptProviderOptions = {}
): ContentTranscriptAcquisitionProvider {

    return new YouTubeTranscriptProvider(
        options
    );

}

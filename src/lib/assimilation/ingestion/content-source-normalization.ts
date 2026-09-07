import {
    assertCanonicalContentSourceRecord,
    type CanonicalContentSourceRecord,
    type ContentSourcePlatform
} from "./canonical-content-source";


export interface PublishedContentSourceInput {

    readonly platform:
        ContentSourcePlatform | string;

    readonly url:
        string;

    readonly externalPlatformId?:
        string;

    readonly title:
        string;

    readonly description?:
        string;

    readonly publishedAt:
        string;

    readonly durationSeconds?:
        number;

    readonly pillar?:
        string;

    readonly tags?:
        readonly string[];

}


export interface NormalizePublishedContentSourceOptions {

    readonly now?:
        string;

}


function normalizePlatform(
    platform: string
): ContentSourcePlatform {

    const value =
        platform
            .trim()
            .toLowerCase();

    if (
        value === "youtube" ||
        value === "youtu.be"
    ) {
        return "youtube";
    }

    if (
        value === "instagram" ||
        value === "ig"
    ) {
        return "instagram";
    }

    if (
        value === "tiktok" ||
        value === "tik tok"
    ) {
        return "tiktok";
    }

    if (
        value === "facebook" ||
        value === "fb"
    ) {
        return "facebook";
    }

    if (
        value === "linkedin" ||
        value === "linked in"
    ) {
        return "linkedin";
    }

    return "other";

}


function normalizeUrl(
    input:
        string
): string {

    const url =
        new URL(
            input.trim()
        );

    url.hash =
        "";

    if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
    ) {

        throw new TypeError(
            "Published source URL must use HTTP or HTTPS."
        );

    }

    if (
        url.protocol === "http:"
    ) {
        url.protocol =
            "https:";
    }

    url.hostname =
        url.hostname.toLowerCase();

    if (
        url.hostname === "youtu.be"
    ) {

        const id =
            url.pathname
                .replace(
                    /^\/+/,
                    ""
                )
                .split(
                    "/"
                )[0];

        if (!id) {
            throw new TypeError(
                "Unable to determine YouTube video identity."
            );
        }

        return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

    }

    if (
        url.hostname === "youtube.com"
    ) {
        url.hostname =
            "www.youtube.com";
    }

    return url.toString();

}


function extractExternalPlatformId(
    platform:
        ContentSourcePlatform,
    canonicalUrl:
        string,
    explicitId?:
        string
): string {

    if (
        explicitId &&
        explicitId.trim().length > 0
    ) {

        return explicitId.trim();

    }

    const url =
        new URL(
            canonicalUrl
        );

    if (
        platform === "youtube"
    ) {

        const queryId =
            url.searchParams.get(
                "v"
            );

        if (queryId) {
            return queryId;
        }

        const parts =
            url.pathname
                .split(
                    "/"
                )
                .filter(
                    Boolean
                );

        const shortsIndex =
            parts.indexOf(
                "shorts"
            );

        if (
            shortsIndex >= 0 &&
            parts[shortsIndex + 1]
        ) {

            return parts[shortsIndex + 1]!;

        }

    }

    const pathParts =
        url.pathname
            .split(
                "/"
            )
            .filter(
                Boolean
            );

    const lastPart =
        pathParts[
            pathParts.length - 1
        ];

    if (lastPart) {
        return lastPart;
    }

    throw new TypeError(
        "Unable to determine external platform identity."
    );

}


function createStableSourceId(
    platform:
        ContentSourcePlatform,
    externalPlatformId:
        string
): string {

    const safePlatformId =
        externalPlatformId
            .trim()
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            );

    if (safePlatformId.length === 0) {
        throw new TypeError(
            "External platform identity cannot be empty."
        );
    }

    return `source:${platform}:${safePlatformId}`;

}


function normalizeTags(
    tags:
        readonly string[] | undefined
): readonly string[] {

    if (!tags) {
        return [];
    }

    const normalized =
        tags
            .map(
                (tag) =>
                    tag
                        .trim()
                        .toLowerCase()
            )
            .filter(
                (tag) =>
                    tag.length > 0
            );

    return [
        ...new Set(
            normalized
        )
    ];

}


export function normalizePublishedContentSource(
    input:
        PublishedContentSourceInput,
    options:
        NormalizePublishedContentSourceOptions = {}
): CanonicalContentSourceRecord {

    if (
        !input ||
        typeof input !== "object"
    ) {
        throw new TypeError(
            "Published content source input must be an object."
        );
    }

    const platform =
        normalizePlatform(
            String(
                input.platform
            )
        );

    const canonicalUrl =
        normalizeUrl(
            input.url
        );

    const externalPlatformId =
        extractExternalPlatformId(
            platform,
            canonicalUrl,
            input.externalPlatformId
        );

    const now =
        options.now ??
        new Date()
            .toISOString();

    const record:
        CanonicalContentSourceRecord = {

        sourceId:
            createStableSourceId(
                platform,
                externalPlatformId
            ),

        platform,

        canonicalUrl,

        externalPlatformId,

        title:
            input.title.trim(),

        ...(input.description
            ? {
                description:
                    input.description.trim()
            }
            : {}),

        publishedAt:
            new Date(
                input.publishedAt
            )
                .toISOString(),

        ...(input.durationSeconds !== undefined
            ? {
                durationSeconds:
                    input.durationSeconds
            }
            : {}),

        sourceStatus:
            "transcript-pending",

        ...(input.pillar
            ? {
                pillar:
                    input.pillar
                        .trim()
                        .toLowerCase()
            }
            : {}),

        tags:
            normalizeTags(
                input.tags
            ),

        ingestedAt:
            now,

        updatedAt:
            now,

        originalSourcePreserved:
            true

    };

    assertCanonicalContentSourceRecord(
        record
    );

    return record;

}

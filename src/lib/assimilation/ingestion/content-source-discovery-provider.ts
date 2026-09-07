import type {
    ContentSourcePlatform
} from "./canonical-content-source";

import type {
    PublishedContentSourceInput
} from "./content-source-normalization";


export interface ContentSourceDiscoveryQuery {

    /**
     * Platform adapter that should perform discovery.
     */
    readonly platform:
        ContentSourcePlatform;

    /**
     * Provider-native account, channel, profile, feed, or collection identity.
     */
    readonly publisherId:
        string;

    /**
     * Optional opaque continuation token owned by the provider.
     */
    readonly cursor?:
        string;

    /**
     * Maximum number of published sources requested.
     */
    readonly limit?:
        number;

}


export interface DiscoveredPublishedContentSource {

    /**
     * Provider-facing published source metadata.
     * This is not yet a durable River canonical record.
     */
    readonly source:
        PublishedContentSourceInput;

    /**
     * Raw provider identity for correlation and diagnostics.
     */
    readonly providerRecordId:
        string;

    /**
     * When the provider observed this source.
     */
    readonly discoveredAt:
        string;

    /**
     * Optional provider-native metadata preserved without granting it
     * authority over River canonical state.
     */
    readonly providerMetadata?:
        Readonly<Record<string, unknown>>;

}


export interface ContentSourceDiscoveryResult {

    readonly platform:
        ContentSourcePlatform;

    readonly sources:
        readonly DiscoveredPublishedContentSource[];

    readonly nextCursor?:
        string;

}


export interface ContentSourceDiscoveryProvider {

    readonly platform:
        ContentSourcePlatform;

    discover(
        query:
            ContentSourceDiscoveryQuery
    ): Promise<ContentSourceDiscoveryResult>;

}


function isNonEmptyString(
    value:
        unknown
): value is string {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

}


function isValidTimestamp(
    value:
        unknown
): value is string {

    return (
        typeof value === "string" &&
        value.length > 0 &&
        Number.isFinite(
            Date.parse(
                value
            )
        )
    );

}


export function assertContentSourceDiscoveryQuery(
    query:
        unknown
): asserts query is ContentSourceDiscoveryQuery {

    if (
        typeof query !== "object" ||
        query === null ||
        Array.isArray(
            query
        )
    ) {

        throw new TypeError(
            "Content source discovery query must be an object."
        );

    }

    const value =
        query as
            Record<string, unknown>;

    if (!isNonEmptyString(value.platform)) {
        throw new TypeError(
            "Content source discovery platform is required."
        );
    }

    if (!isNonEmptyString(value.publisherId)) {
        throw new TypeError(
            "Content source discovery publisherId is required."
        );
    }

    if (
        value.limit !== undefined &&
        (
            typeof value.limit !== "number" ||
            !Number.isInteger(value.limit) ||
            value.limit <= 0
        )
    ) {

        throw new TypeError(
            "Content source discovery limit must be a positive integer."
        );

    }

    if (
        value.cursor !== undefined &&
        !isNonEmptyString(value.cursor)
    ) {

        throw new TypeError(
            "Content source discovery cursor must be a non-empty string when provided."
        );

    }

}


export function assertContentSourceDiscoveryResult(
    result:
        unknown,
    expectedPlatform:
        ContentSourcePlatform
): asserts result is ContentSourceDiscoveryResult {

    if (
        typeof result !== "object" ||
        result === null ||
        Array.isArray(
            result
        )
    ) {

        throw new TypeError(
            "Content source discovery result must be an object."
        );

    }

    const value =
        result as
            Record<string, unknown>;

    if (
        value.platform !==
        expectedPlatform
    ) {

        throw new TypeError(
            "Content source discovery result platform does not match the provider platform."
        );

    }

    if (!Array.isArray(value.sources)) {
        throw new TypeError(
            "Content source discovery result sources must be an array."
        );
    }

    for (
        const discovered of
        value.sources
    ) {

        if (
            typeof discovered !== "object" ||
            discovered === null ||
            Array.isArray(
                discovered
            )
        ) {

            throw new TypeError(
                "Discovered published content source must be an object."
            );

        }

        const item =
            discovered as
                Record<string, unknown>;

        if (!isNonEmptyString(item.providerRecordId)) {
            throw new TypeError(
                "Discovered source providerRecordId is required."
            );
        }

        if (!isValidTimestamp(item.discoveredAt)) {
            throw new TypeError(
                "Discovered source discoveredAt must be a valid timestamp."
            );
        }

        if (
            typeof item.source !== "object" ||
            item.source === null ||
            Array.isArray(
                item.source
            )
        ) {

            throw new TypeError(
                "Discovered source metadata must be an object."
            );

        }

        const source =
            item.source as
                Record<string, unknown>;

        if (
            String(source.platform)
                .trim()
                .toLowerCase() !==
            expectedPlatform
        ) {

            throw new TypeError(
                "Discovered source platform does not match the provider platform."
            );

        }

        if (!isNonEmptyString(source.url)) {
            throw new TypeError(
                "Discovered source URL is required."
            );
        }

        if (!isNonEmptyString(source.title)) {
            throw new TypeError(
                "Discovered source title is required."
            );
        }

        if (!isValidTimestamp(source.publishedAt)) {
            throw new TypeError(
                "Discovered source publishedAt must be a valid timestamp."
            );
        }

    }

    if (
        value.nextCursor !== undefined &&
        !isNonEmptyString(value.nextCursor)
    ) {

        throw new TypeError(
            "Content source discovery nextCursor must be a non-empty string when provided."
        );

    }

}


export async function discoverPublishedContentSources(
    provider:
        ContentSourceDiscoveryProvider,
    query:
        ContentSourceDiscoveryQuery
): Promise<ContentSourceDiscoveryResult> {

    if (
        !provider ||
        typeof provider !== "object" ||
        typeof provider.discover !== "function"
    ) {

        throw new TypeError(
            "Content source discovery requires a provider."
        );

    }

    assertContentSourceDiscoveryQuery(
        query
    );

    if (
        provider.platform !==
        query.platform
    ) {

        throw new TypeError(
            "Content source discovery query platform does not match the provider."
        );

    }

    const result =
        await provider.discover(
            query
        );

    assertContentSourceDiscoveryResult(
        result,
        provider.platform
    );

    return result;

}

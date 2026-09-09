import {
    assertCanonicalContentSourceRecord,
    type CanonicalContentSourceRecord,
    type ContentSourcePlatform,
    type ContentSourceStatus
} from "../assimilation/ingestion/canonical-content-source";

import {
    assertContentTranscriptRecord,
    type ContentTranscriptRecord
} from "../assimilation/ingestion/content-transcript-record";


export type RiverContentTranscriptState =
    "pending" |
    "available";


export interface RiverContentCatalogEntry {

    readonly sourceId:
        string;

    readonly platform:
        ContentSourcePlatform;

    readonly canonicalUrl:
        string;

    readonly externalPlatformId:
        string;

    readonly title:
        string;

    readonly description?:
        string;

    readonly publishedAt:
        string;

    readonly sourceStatus:
        ContentSourceStatus;

    readonly transcriptState:
        RiverContentTranscriptState;

    readonly transcriptId?:
        string;

    readonly transcriptPersistedAt?:
        string;

    readonly transcriptProvider?:
        string;

    readonly transcriptLanguage?:
        string;

    readonly ingestedAt:
        string;

    readonly updatedAt:
        string;

    readonly originalSourcePreserved:
        true;

}


function optionalNormalizedString(
    value:
        unknown
): string | undefined {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        return undefined;

    }

    return value;

}


export function createRiverContentCatalogEntry(
    source:
        CanonicalContentSourceRecord,
    transcript?:
        ContentTranscriptRecord
): RiverContentCatalogEntry {

    assertCanonicalContentSourceRecord(
        source
    );

    if (transcript !== undefined) {

        assertContentTranscriptRecord(
            transcript
        );

        if (
            transcript.sourceId !==
            source.sourceId
        ) {

            throw new TypeError(
                "River content catalog transcript source identity must match the canonical source."
            );

        }

        if (
            transcript.platform !==
            source.platform
        ) {

            throw new TypeError(
                "River content catalog transcript platform must match the canonical source."
            );

        }

    }

    const provenance =
        transcript?.transcript
            .provenance;

    return {
        sourceId:
            source.sourceId,

        platform:
            source.platform,

        canonicalUrl:
            source.canonicalUrl,

        externalPlatformId:
            source.externalPlatformId,

        title:
            source.title,

        ...(
            optionalNormalizedString(
                source.description
            ) === undefined
                ? {}
                : {
                    description:
                        source.description
                }
        ),

        publishedAt:
            source.publishedAt,

        sourceStatus:
            source.sourceStatus,

        transcriptState:
            transcript === undefined
                ? "pending"
                : "available",

        ...(
            transcript === undefined
                ? {}
                : {
                    transcriptId:
                        transcript.transcriptId,

                    transcriptPersistedAt:
                        transcript.persistedAt
                }
        ),

        ...(
            optionalNormalizedString(
                provenance?.provider
            ) === undefined
                ? {}
                : {
                    transcriptProvider:
                        provenance?.provider
                }
        ),

        ...(
            optionalNormalizedString(
                provenance?.language
            ) === undefined
                ? {}
                : {
                    transcriptLanguage:
                        provenance?.language
                }
        ),

        ingestedAt:
            source.ingestedAt,

        updatedAt:
            source.updatedAt,

        originalSourcePreserved:
            true
    };

}

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    createFileSystemContentTranscriptPersistence
} from "../persistence/content-transcript-filesystem";

import {
    createProductionSourceAssimilation
} from "./engine";


export interface TranscriptAssimilationCliArguments {

    readonly persistenceRoot:
        string;

    readonly sourceId:
        string;

}


function requireNonEmpty(
    value:
        string | undefined,
    label:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {

        throw new TypeError(
            `${label} is required.`
        );

    }

    return value.trim();

}


function requireSourceId(
    value:
        string | undefined
): string {

    const sourceId =
        requireNonEmpty(
            value,
            "Source ID"
        );

    if (
        !sourceId.startsWith(
            "source:"
        )
    ) {

        throw new TypeError(
            "Source ID must be a valid River source identifier."
        );

    }

    return sourceId;

}


export function parseTranscriptAssimilationCliArguments(
    arguments_:
        readonly string[]
): TranscriptAssimilationCliArguments {

    if (
        arguments_.length !==
        2
    ) {

        throw new TypeError(
            "Usage: assimilation:transcript <persistence-root> <source-id>"
        );

    }

    return {
        persistenceRoot:
            requireNonEmpty(
                arguments_[0],
                "Persistence root"
            ),

        sourceId:
            requireSourceId(
                arguments_[1]
            )
    };

}


export async function runTranscriptAssimilationCli(
    arguments_:
        readonly string[]
) {

    const parsed =
        parseTranscriptAssimilationCliArguments(
            arguments_
        );

    const canonicalPersistence =
        createFileSystemCanonicalContentSourcePersistence(
            parsed.persistenceRoot
        );

    const transcriptPersistence =
        createFileSystemContentTranscriptPersistence(
            parsed.persistenceRoot
        );

    const source =
        await canonicalPersistence.retrieve(
            parsed.sourceId
        );

    const transcriptId =
        `transcript:${parsed.sourceId}`;

    const transcript =
        await transcriptPersistence.retrieve(
            transcriptId
        );

    if (
        transcript.sourceId !==
        source.sourceId
    ) {

        throw new TypeError(
            "Persisted transcript source identity does not match the canonical source."
        );

    }

    if (
        transcript.platform !==
        source.platform
    ) {

        throw new TypeError(
            "Persisted transcript platform does not match the canonical source."
        );

    }

    const service =
        createProductionSourceAssimilation(
            parsed.persistenceRoot
        );

    const result =
        await service.ingestAndAssimilate(
            {
                content:
                    transcript.transcript.text,

                assetType:
                    "transcript",

                originalFilename:
                    `${source.externalPlatformId}.transcript.txt`,

                title:
                    `${source.title} Transcript`,

                mimeType:
                    "text/plain",

                ...(
                    transcript.transcript.provenance.language ===
                        undefined
                        ? {}
                        : {
                            language:
                                transcript.transcript.provenance.language
                        }
                ),

                createdAt:
                    source.publishedAt,

                ownership: {
                    ownerType:
                        "unknown",

                    evidence:
                        "Canonical source and governed transcript records do not establish ownership."
                },

                rightsStatus:
                    "unknown",

                usagePermission: {
                    mayStore:
                        true,

                    mayExtract:
                        true,

                    mayAnalyze:
                        true,

                    mayQuote:
                        false,

                    mayTransform:
                        true,

                    mayPublish:
                        false,

                    mayCommercialize:
                        false,

                    mayTrainModels:
                        false
                },

                privacy:
                    "internal",

                sensitivityCategories:
                    [],

                reviewStatus:
                    "pending",

                submittedBy: {
                    type:
                        "system",

                    id:
                        "river-os:transcript-assimilation"
                },

                intakeMethod:
                    "connector",

                originalSource:
                    source.canonicalUrl,

                originalPlatformId:
                    source.externalPlatformId,

                declaredPurpose:
                    "Internal governed Assimilation of a persisted content transcript for analysis and knowledge derivation."
            }
        );

    if (
        result.status !==
        "completed"
    ) {

        throw new Error(
            result.failedStage ===
                null
                ? "Transcript production Assimilation failed."
                : `Transcript production Assimilation failed during ${result.failedStage}.`
        );

    }

    return result;

}

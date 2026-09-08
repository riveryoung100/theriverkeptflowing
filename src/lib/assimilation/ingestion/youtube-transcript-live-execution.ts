import {
    createGovernedContentTranscriptIntake,
    type ContentTranscriptIntakeResult
} from "./content-transcript-intake";

import {
    createYouTubeTranscriptProvider
} from "./youtube-transcript-provider";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    createFileSystemContentTranscriptPersistence
} from "../persistence/content-transcript-filesystem";


export const YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION =
    "I_AUTHORIZE_ONE_BOUNDED_LIVE_YOUTUBE_TRANSCRIPT_ACQUISITION" as const;


export interface YouTubeTranscriptLiveExecutionOptions {

    readonly persistenceRoot:
        string;

    readonly sourceId:
        string;

    readonly authorization:
        string;

    readonly now:
        string;

    readonly preferredLanguage?:
        string;

    readonly fetcher?:
        typeof fetch;

}


export interface YouTubeTranscriptLiveExecutionResult {

    readonly sourceId:
        string;

    readonly intake:
        ContentTranscriptIntakeResult;

}


function requireNonEmpty(
    value:
        string,
    name:
        string
): string {

    if (
        typeof value !==
            "string"
    ) {

        throw new TypeError(
            `${name} is required.`
        );

    }

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


function requireTimestamp(
    value:
        string
): string {

    const normalized =
        requireNonEmpty(
            value,
            "Execution timestamp"
        );

    if (
        !Number.isFinite(
            Date.parse(
                normalized
            )
        )
    ) {

        throw new TypeError(
            "Execution timestamp must be valid."
        );

    }

    return normalized;

}


export async function executeYouTubeTranscriptLiveAcquisition(
    options:
        YouTubeTranscriptLiveExecutionOptions
): Promise<YouTubeTranscriptLiveExecutionResult> {

    const persistenceRoot =
        requireNonEmpty(
            options.persistenceRoot,
            "Persistence root"
        );

    const sourceId =
        requireNonEmpty(
            options.sourceId,
            "Canonical source identifier"
        );

    if (
        !sourceId.startsWith(
            "source:youtube:"
        )
    ) {

        throw new TypeError(
            "Live YouTube transcript acquisition requires a YouTube River source identifier."
        );

    }

    const now =
        requireTimestamp(
            options.now
        );

    const preferredLanguage =
        options.preferredLanguage ===
            undefined
            ? undefined
            : requireNonEmpty(
                options.preferredLanguage,
                "Preferred transcript language"
            );

    if (
        options.authorization !==
        YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION
    ) {

        throw new TypeError(
            "Explicit live YouTube transcript acquisition authorization is required."
        );

    }

    const canonicalPersistence =
        createFileSystemCanonicalContentSourcePersistence(
            persistenceRoot
        );

    const source =
        await canonicalPersistence.retrieve(
            sourceId
        );

    if (
        source.platform !==
        "youtube"
    ) {

        throw new TypeError(
            "Canonical source platform must be YouTube for live transcript acquisition."
        );

    }

    if (
        source.sourceId !==
        sourceId
    ) {

        throw new TypeError(
            "Retrieved canonical source identity does not match the requested source."
        );

    }

    const provider =
        createYouTubeTranscriptProvider(
            {
                now:
                    () =>
                        now,

                ...(
                    options.fetcher ===
                        undefined
                        ? {}
                        : {
                            fetcher:
                                options.fetcher
                        }
                )
            }
        );

    const transcriptPersistence =
        createFileSystemContentTranscriptPersistence(
            persistenceRoot
        );

    const intake =
        createGovernedContentTranscriptIntake(
            provider,
            transcriptPersistence
        );

    const result =
        await intake.ingest(
            {
                source,

                ...(
                    preferredLanguage ===
                        undefined
                        ? {}
                        : {
                            preferredLanguage
                        }
                )
            },
            {
                now
            }
        );

    return {
        sourceId,
        intake:
            result
    };

}

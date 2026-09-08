import type {
    YouTubeTranscriptLiveExecutionResult
} from "./youtube-transcript-live-execution";

import {
    YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION,
    executeYouTubeTranscriptLiveAcquisition
} from "./youtube-transcript-live-execution";


export const YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG =
    "--authorize-live-youtube-transcript" as const;


export interface YouTubeTranscriptLiveCliArguments {

    readonly persistenceRoot:
        string;

    readonly sourceId:
        string;

    readonly preferredLanguage?:
        string;

}


export interface RunYouTubeTranscriptLiveCliOptions {

    readonly arguments:
        readonly string[];

    readonly now?:
        () => string;

    readonly fetcher?:
        typeof fetch;

}


function requireNonEmpty(
    value:
        string | undefined,
    name:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {

        throw new TypeError(
            `${name} is required.`
        );

    }

    return value.trim();

}


export function parseYouTubeTranscriptLiveCliArguments(
    arguments_:
        readonly string[]
): YouTubeTranscriptLiveCliArguments {

    let authorized =
        false;

    let preferredLanguage:
        string | undefined;

    const positional:
        string[] =
            [];

    for (
        let index =
            0;
        index <
            arguments_.length;
        index +=
            1
    ) {

        const argument =
            arguments_[index];

        if (
            argument ===
            YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG
        ) {

            if (
                authorized
            ) {

                throw new TypeError(
                    "Live YouTube transcript authorization may be specified only once."
                );

            }

            authorized =
                true;

            continue;

        }

        if (
            argument ===
            "--language"
        ) {

            if (
                preferredLanguage !==
                undefined
            ) {

                throw new TypeError(
                    "Preferred transcript language may be specified only once."
                );

            }

            preferredLanguage =
                requireNonEmpty(
                    arguments_[
                        index +
                        1
                    ],
                    "Preferred transcript language"
                );

            index +=
                1;

            continue;

        }

        if (
            argument?.startsWith(
                "--"
            )
        ) {

            throw new TypeError(
                `Unexpected YouTube transcript option: ${argument}`
            );

        }

        positional.push(
            requireNonEmpty(
                argument,
                "YouTube transcript positional argument"
            )
        );

    }

    if (
        !authorized
    ) {

        throw new TypeError(
            "Explicit live YouTube transcript acquisition authorization is required."
        );

    }

    if (
        positional.length !==
        2
    ) {

        throw new TypeError(
            "Usage: content:youtube:transcript <persistence-root> <source-id> --authorize-live-youtube-transcript [--language <language-code>]"
        );

    }

    const persistenceRoot =
        positional[0]!;

    const sourceId =
        positional[1]!;

    if (
        !sourceId.startsWith(
            "source:youtube:"
        )
    ) {

        throw new TypeError(
            "Live YouTube transcript CLI requires a YouTube River source identifier."
        );

    }

    return {
        persistenceRoot,
        sourceId,

        ...(
            preferredLanguage ===
                undefined
                ? {}
                : {
                    preferredLanguage
                }
        )
    };

}


export async function runYouTubeTranscriptLiveCli(
    options:
        RunYouTubeTranscriptLiveCliOptions
): Promise<YouTubeTranscriptLiveExecutionResult> {

    const parsed =
        parseYouTubeTranscriptLiveCliArguments(
            options.arguments
        );

    return executeYouTubeTranscriptLiveAcquisition(
        {
            persistenceRoot:
                parsed.persistenceRoot,

            sourceId:
                parsed.sourceId,

            authorization:
                YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION,

            now:
                (
                    options.now ??
                    (
                        () =>
                            new Date()
                                .toISOString()
                    )
                )(),

            ...(
                parsed.preferredLanguage ===
                    undefined
                    ? {}
                    : {
                        preferredLanguage:
                            parsed.preferredLanguage
                    }
            ),

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

}

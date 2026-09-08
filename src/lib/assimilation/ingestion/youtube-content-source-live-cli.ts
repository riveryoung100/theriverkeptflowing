import type {
    YouTubeContentSourceLiveExecutionResult
} from "./youtube-content-source-live-execution";

import {
    YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION,
    executeYouTubeContentSourceLiveDiscovery
} from "./youtube-content-source-live-execution";


export const YOUTUBE_CONTENT_SOURCE_LIVE_CLI_AUTHORIZATION_FLAG =
    "--authorize-live-youtube-discovery" as const;


export interface YouTubeContentSourceLiveCliArguments {

    readonly persistenceRoot:
        string;

    readonly handle:
        string;

    readonly limit?:
        number;

    readonly cursor?:
        string;

}


export interface RunYouTubeContentSourceLiveCliOptions {

    readonly arguments:
        readonly string[];

    readonly readCredential:
        () => Promise<string>;

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
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        throw new TypeError(
            `${name} is required.`
        );

    }

    return value.trim();

}


export function parseYouTubeContentSourceLiveCliArguments(
    arguments_:
        readonly string[]
): YouTubeContentSourceLiveCliArguments {

    const authorized =
        arguments_.includes(
            YOUTUBE_CONTENT_SOURCE_LIVE_CLI_AUTHORIZATION_FLAG
        );

    if (!authorized) {

        throw new TypeError(
            "Explicit live YouTube discovery authorization is required."
        );

    }

    const positional:
        string[] = [];

    let limit:
        number | undefined;

    let cursor:
        string | undefined;

    for (
        let index = 0;
        index < arguments_.length;
        index += 1
    ) {

        const argument =
            arguments_[index];

        if (
            argument ===
            YOUTUBE_CONTENT_SOURCE_LIVE_CLI_AUTHORIZATION_FLAG
        ) {

            continue;

        }

        if (
            argument ===
            "--limit"
        ) {

            if (
                limit !== undefined
            ) {

                throw new TypeError(
                    "YouTube discovery limit may be specified only once."
                );

            }

            const rawLimit =
                requireNonEmpty(
                    arguments_[index + 1],
                    "YouTube discovery limit"
                );

            const parsedLimit =
                Number(
                    rawLimit
                );

            if (
                !Number.isInteger(
                    parsedLimit
                ) ||
                parsedLimit <= 0
            ) {

                throw new TypeError(
                    "YouTube discovery limit must be a positive integer."
                );

            }

            limit =
                parsedLimit;

            index +=
                1;

            continue;

        }

        if (
            argument ===
            "--cursor"
        ) {

            if (
                cursor !== undefined
            ) {

                throw new TypeError(
                    "YouTube discovery cursor may be specified only once."
                );

            }

            cursor =
                requireNonEmpty(
                    arguments_[index + 1],
                    "YouTube discovery cursor"
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
                `Unexpected YouTube discovery option: ${argument}`
            );

        }

        positional.push(
            requireNonEmpty(
                argument,
                "YouTube discovery positional argument"
            )
        );

    }

    if (
        positional.length !==
        2
    ) {

        throw new TypeError(
            "Usage: content:youtube:discover <persistence-root> <handle> --authorize-live-youtube-discovery [--limit <positive-integer>] [--cursor <token>] < credential-via-stdin"
        );

    }

    return {
        persistenceRoot:
            positional[0]!,

        handle:
            positional[1]!,

        ...(
            limit === undefined
                ? {}
                : {
                    limit
                }
        ),

        ...(
            cursor === undefined
                ? {}
                : {
                    cursor
                }
        )
    };

}


export async function readYouTubeApiCredentialFromStdin(
    input:
        NodeJS.ReadableStream = process.stdin
): Promise<string> {

    let credential =
        "";

    input.setEncoding(
        "utf8"
    );

    for await (
        const chunk of
        input
    ) {

        credential +=
            String(
                chunk
            );

    }

    return credential.trim();

}


export async function runYouTubeContentSourceLiveCli(
    options:
        RunYouTubeContentSourceLiveCliOptions
): Promise<YouTubeContentSourceLiveExecutionResult> {

    const parsed =
        parseYouTubeContentSourceLiveCliArguments(
            options.arguments
        );

    return executeYouTubeContentSourceLiveDiscovery(
        {
            persistenceRoot:
                parsed.persistenceRoot,

            handle:
                parsed.handle,

            authorization:
                YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION,

            readCredential:
                options.readCredential,

            now:
                (
                    options.now ??
                    (() =>
                        new Date().toISOString())
                )(),

            ...(
                parsed.limit === undefined
                    ? {}
                    : {
                        limit:
                            parsed.limit
                    }
            ),

            ...(
                parsed.cursor === undefined
                    ? {}
                    : {
                        cursor:
                            parsed.cursor
                    }
            ),

            ...(
                options.fetcher === undefined
                    ? {}
                    : {
                        fetcher:
                            options.fetcher
                    }
            )
        }
    );

}

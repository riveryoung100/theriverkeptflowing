import {
    createGovernedContentSourceDiscoveryIntake,
    type ContentSourceDiscoveryIntakeResult
} from "./content-source-discovery-intake";

import {
    createGovernedPublishedContentSourceIntake
} from "./published-content-source-intake";

import {
    createYouTubeChannelHandleResolver,
    type YouTubeResolvedChannel
} from "./youtube-channel-handle-resolver";

import {
    createYouTubeContentSourceDiscoveryProvider
} from "./youtube-content-source-discovery-provider";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    createFileSystemContentSourceDiscoveryProvenancePersistence
} from "../persistence/content-source-discovery-provenance-filesystem";


export const YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION =
    "I_AUTHORIZE_ONE_BOUNDED_LIVE_YOUTUBE_DISCOVERY" as const;


export interface YouTubeContentSourceLiveExecutionOptions {

    readonly persistenceRoot:
        string;

    readonly handle:
        string;

    readonly authorization:
        string;

    readonly readCredential:
        () => Promise<string>;

    readonly now:
        string;

    readonly limit?:
        number;

    readonly cursor?:
        string;

    readonly fetcher?:
        typeof fetch;

}


export interface YouTubeContentSourceLiveExecutionResult {

    readonly channel:
        YouTubeResolvedChannel;

    readonly intake:
        ContentSourceDiscoveryIntakeResult;

}


function requireNonEmpty(
    value:
        string,
    name:
        string
): string {

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


export async function executeYouTubeContentSourceLiveDiscovery(
    options:
        YouTubeContentSourceLiveExecutionOptions
): Promise<YouTubeContentSourceLiveExecutionResult> {

    const persistenceRoot =
        requireNonEmpty(
            options.persistenceRoot,
            "Persistence root"
        );

    const handle =
        requireNonEmpty(
            options.handle,
            "YouTube handle"
        );

    const now =
        requireTimestamp(
            options.now
        );

    if (
        options.limit !== undefined &&
        (
            !Number.isInteger(
                options.limit
            ) ||
            options.limit <= 0
        )
    ) {

        throw new TypeError(
            "Discovery limit must be a positive integer."
        );

    }

    const cursor =
        options.cursor === undefined
            ? undefined
            : requireNonEmpty(
                options.cursor,
                "Discovery cursor"
            );

    if (
        typeof options.readCredential !==
        "function"
    ) {

        throw new TypeError(
            "Credential reader is required."
        );

    }

    if (
        options.authorization !==
        YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION
    ) {

        throw new TypeError(
            "Explicit live YouTube discovery authorization is required."
        );

    }

    const credential =
        (
            await options.readCredential()
        ).trim();

    if (
        credential.length ===
        0
    ) {

        throw new TypeError(
            "YouTube API credential is required through the authorized runtime credential reader."
        );

    }

    const resolver =
        createYouTubeChannelHandleResolver(
            {
                apiKey:
                    credential,

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

    const channel =
        await resolver.resolve(
            handle
        );

    const provider =
        createYouTubeContentSourceDiscoveryProvider(
            {
                apiKey:
                    credential,

                now:
                    () =>
                        now,

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

    const canonicalPersistence =
        createFileSystemCanonicalContentSourcePersistence(
            persistenceRoot
        );

    const provenancePersistence =
        createFileSystemContentSourceDiscoveryProvenancePersistence(
            persistenceRoot
        );

    const intake =
        createGovernedPublishedContentSourceIntake(
            canonicalPersistence
        );

    const discoveryIntake =
        createGovernedContentSourceDiscoveryIntake(
            provider,
            intake,
            provenancePersistence
        );

    const result =
        await discoveryIntake.execute(
            {
                platform:
                    "youtube",

                publisherId:
                    channel.channelId,

                ...(
                    cursor === undefined
                        ? {}
                        : {
                            cursor
                        }
                ),

                ...(
                    options.limit === undefined
                        ? {}
                        : {
                            limit:
                                options.limit
                        }
                )
            },
            {
                now
            }
        );

    return {
        channel,
        intake:
            result
    };

}

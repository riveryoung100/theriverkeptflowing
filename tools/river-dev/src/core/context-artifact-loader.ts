import {
    readFile
} from "node:fs/promises";

import {
    resolve
} from "node:path";

import type {
    RiverDevContextRelevantEntry,
RiverDevContextArtifact,
RiverDevContextArtifactBundle
} from "../types";


const DEFAULT_MAX_ARTIFACT_BYTES =
    50_000;


const DEFAULT_MAX_TOTAL_BYTES =
    250_000;


function isProtectedPath(
    path:
        string
): boolean {

    const normalized =
        path.toLowerCase();

    return (
        normalized.includes(".env") ||
        normalized.includes(".git") ||
        normalized.includes("node_modules") ||
        normalized.includes("dist") ||
        normalized.includes("secrets")
    );

}


function truncateText(
    value:
        string,
    maximumBytes:
        number
): string {

    const buffer =
        Buffer.from(
            value,
            "utf8"
        );

    if (
        buffer.byteLength <= maximumBytes
    ) {
        return value;
    }

    return buffer
        .subarray(
            0,
            maximumBytes
        )
        .toString(
            "utf8"
        );

}


export async function loadContextArtifacts(
    repositoryRoot:
        string,
    entries:
        readonly RiverDevContextRelevantEntry[]
): Promise<RiverDevContextArtifactBundle> {

    let loadedBytes =
        0;

    let truncatedCount =
        0;

    let omittedCount =
        0;

    const artifacts:
        RiverDevContextArtifact[] =
            [];


    const prioritizedEntries =
        [
            ...entries
        ];


    for (
        const entry of prioritizedEntries
    ) {

        if (
            entry.kind !==
            "file"
        ) {
            continue;
        }


        if (
            isProtectedPath(
                entry.path
            )
        ) {
            omittedCount++;
            continue;
        }


        if (
            loadedBytes >=
            DEFAULT_MAX_TOTAL_BYTES
        ) {
            omittedCount++;
            continue;
        }


        const absolutePath =
            resolve(
                repositoryRoot,
                entry.path
            );


        try {

            const content =
                await readFile(
                    absolutePath,
                    "utf8"
                );


            const originalBytes =
                Buffer.byteLength(
                    content,
                    "utf8"
                );


            const remainingBytes =
                DEFAULT_MAX_TOTAL_BYTES -
                loadedBytes;


            const maximumBytes =
                Math.min(
                    DEFAULT_MAX_ARTIFACT_BYTES,
                    remainingBytes
                );


            const boundedContent =
                truncateText(
                    content,
                    maximumBytes
                );


            const loadedByteCount =
                Buffer.byteLength(
                    boundedContent,
                    "utf8"
                );


            if (
                loadedByteCount <
                originalBytes
            ) {
                truncatedCount++;
            }


            loadedBytes +=
                loadedByteCount;


            artifacts.push(
                {
                    path:
                        entry.path,

                    classification:
                        entry.classification,

                    reason:
                        entry.reason,

                    originalBytes,

                    loadedBytes:
                        loadedByteCount,

                    truncated:
                        loadedByteCount <
                        originalBytes,

                    content:
                        boundedContent
                }
            );

        }
        catch {

            omittedCount++;

        }

    }


    return {

        version:
            "1.0.0",

        maximumArtifactBytes:
            DEFAULT_MAX_ARTIFACT_BYTES,

        maximumTotalBytes:
            DEFAULT_MAX_TOTAL_BYTES,

        loadedBytes,

        loadedCount:
            artifacts.length,

        truncatedCount,

        omittedCount,

        artifacts

    };

}




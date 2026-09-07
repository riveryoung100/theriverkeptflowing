import {
    mkdir,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    resolve,
    sep
} from "node:path";

import {
    assertContentTranscriptRecord,
    type ContentTranscriptRecord
} from "../ingestion/content-transcript-record";


export interface ContentTranscriptPersistence {

    persist(
        record:
            ContentTranscriptRecord
    ): Promise<string>;

    retrieve(
        transcriptId:
            string
    ): Promise<ContentTranscriptRecord>;

}


function assertTranscriptId(
    transcriptId:
        unknown
): asserts transcriptId is string {

    if (
        typeof transcriptId !== "string" ||
        !transcriptId.startsWith(
            "transcript:source:"
        ) ||
        transcriptId.trim().length <=
            "transcript:source:".length
    ) {

        throw new TypeError(
            "Transcript persistence requires a valid River transcript identifier."
        );

    }

}


function resolveTranscriptPath(
    rootDirectory:
        string,
    transcriptId:
        string
): string {

    assertTranscriptId(
        transcriptId
    );

    const transcriptRoot =
        resolve(
            rootDirectory,
            "content-transcripts"
        );

    const encodedId =
        encodeURIComponent(
            transcriptId
        );

    const candidate =
        resolve(
            transcriptRoot,
            `${encodedId}.json`
        );

    if (
        candidate !== transcriptRoot &&
        !candidate.startsWith(
            `${transcriptRoot}${sep}`
        )
    ) {

        throw new TypeError(
            "Transcript path escaped the configured persistence root."
        );

    }

    return candidate;

}


function parsePersistedRecord(
    serialized:
        string,
    requestedTranscriptId:
        string
): ContentTranscriptRecord {

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                serialized
            );

    } catch {

        throw new TypeError(
            "Persisted transcript contains malformed JSON."
        );

    }

    try {

        assertContentTranscriptRecord(
            parsed
        );

    } catch {

        throw new TypeError(
            "Persisted transcript failed authoritative validation."
        );

    }

    if (
        parsed.transcriptId !==
        requestedTranscriptId
    ) {

        throw new TypeError(
            "Persisted transcript identity does not match the requested River transcript identity."
        );

    }

    return parsed;

}


export class FileSystemContentTranscriptPersistence
implements ContentTranscriptPersistence {

    public constructor(
        private readonly rootDirectory:
            string
    ) {

        if (
            typeof rootDirectory !== "string" ||
            rootDirectory.trim().length === 0
        ) {

            throw new TypeError(
                "Transcript persistence root is required."
            );

        }

    }


    public async persist(
        record:
            ContentTranscriptRecord
    ): Promise<string> {

        assertContentTranscriptRecord(
            record
        );

        const targetPath =
            resolveTranscriptPath(
                this.rootDirectory,
                record.transcriptId
            );

        const temporaryPath =
            `${targetPath}.tmp`;

        await mkdir(
            dirname(
                targetPath
            ),
            {
                recursive:
                    true
            }
        );

        try {

            await writeFile(
                temporaryPath,
                JSON.stringify(
                    record,
                    null,
                    2
                ) + "\n",
                "utf8"
            );

            await writeFile(
                targetPath,
                await readFile(
                    temporaryPath
                ),
                {
                    flag:
                        "wx"
                }
            );

            await rm(
                temporaryPath,
                {
                    force:
                        true
                }
            );

            return targetPath;

        } catch (error) {

            await rm(
                temporaryPath,
                {
                    force:
                        true
                }
            );

            throw error;

        }

    }


    public async retrieve(
        transcriptId:
            string
    ): Promise<ContentTranscriptRecord> {

        const targetPath =
            resolveTranscriptPath(
                this.rootDirectory,
                transcriptId
            );

        const serialized =
            await readFile(
                targetPath,
                "utf8"
            );

        return parsePersistedRecord(
            serialized,
            transcriptId
        );

    }

}


export function createFileSystemContentTranscriptPersistence(
    rootDirectory:
        string
): ContentTranscriptPersistence {

    return new FileSystemContentTranscriptPersistence(
        rootDirectory
    );

}

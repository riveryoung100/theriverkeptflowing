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
    assertCanonicalContentSourceRecord,
    type CanonicalContentSourceRecord
} from "../ingestion/canonical-content-source";


export interface CanonicalContentSourcePersistence {

    persist(
        record:
            CanonicalContentSourceRecord
    ): Promise<string>;

    retrieve(
        sourceId:
            string
    ): Promise<CanonicalContentSourceRecord>;

}


function assertSourceId(
    sourceId:
        unknown
): asserts sourceId is string {

    if (
        typeof sourceId !== "string" ||
        !sourceId.startsWith(
            "source:"
        ) ||
        sourceId.trim().length <=
            "source:".length
    ) {

        throw new TypeError(
            "Canonical content source persistence requires a valid River source identifier."
        );

    }

}


function resolveCanonicalSourcePath(
    rootDirectory:
        string,
    sourceId:
        string
): string {

    assertSourceId(
        sourceId
    );

    const sourceRoot =
        resolve(
            rootDirectory,
            "canonical-content-sources"
        );

    const encodedSourceId =
        encodeURIComponent(
            sourceId
        );

    const candidate =
        resolve(
            sourceRoot,
            `${encodedSourceId}.json`
        );

    if (
        candidate !== sourceRoot &&
        !candidate.startsWith(
            `${sourceRoot}${sep}`
        )
    ) {

        throw new TypeError(
            "Canonical content source path escaped the configured persistence root."
        );

    }

    return candidate;

}


function parsePersistedRecord(
    serialized:
        string,
    requestedSourceId:
        string
): CanonicalContentSourceRecord {

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                serialized
            );

    } catch {

        throw new TypeError(
            "Persisted canonical content source contains malformed JSON."
        );

    }

    try {

        assertCanonicalContentSourceRecord(
            parsed
        );

    } catch {

        throw new TypeError(
            "Persisted canonical content source failed authoritative validation."
        );

    }

    if (
        parsed.sourceId !==
        requestedSourceId
    ) {

        throw new TypeError(
            "Persisted canonical content source identity does not match the requested River source identity."
        );

    }

    return parsed;

}


export class FileSystemCanonicalContentSourcePersistence
implements CanonicalContentSourcePersistence {

    public constructor(
        private readonly rootDirectory:
            string
    ) {

        if (
            typeof rootDirectory !==
                "string" ||
            rootDirectory.trim().length ===
                0
        ) {

            throw new TypeError(
                "Canonical content source persistence root is required."
            );

        }

    }


    public async persist(
        record:
            CanonicalContentSourceRecord
    ): Promise<string> {

        assertCanonicalContentSourceRecord(
            record
        );

        const targetPath =
            resolveCanonicalSourcePath(
                this.rootDirectory,
                record.sourceId
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
        sourceId:
            string
    ): Promise<CanonicalContentSourceRecord> {

        const targetPath =
            resolveCanonicalSourcePath(
                this.rootDirectory,
                sourceId
            );

        const serialized =
            await readFile(
                targetPath,
                "utf8"
            );

        return parsePersistedRecord(
            serialized,
            sourceId
        );

    }

}


export function createFileSystemCanonicalContentSourcePersistence(
    rootDirectory:
        string
): CanonicalContentSourcePersistence {

    return new FileSystemCanonicalContentSourcePersistence(
        rootDirectory
    );

}

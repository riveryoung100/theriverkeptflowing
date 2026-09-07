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
    assertContentSourceDiscoveryProvenanceRecord,
    type ContentSourceDiscoveryProvenanceRecord
} from "../ingestion/content-source-discovery-provenance";


export interface ContentSourceDiscoveryProvenancePersistence {

    persist(
        record:
            ContentSourceDiscoveryProvenanceRecord
    ): Promise<string>;

    retrieve(
        provenanceId:
            string
    ): Promise<ContentSourceDiscoveryProvenanceRecord>;

}


function assertProvenanceId(
    provenanceId:
        unknown
): asserts provenanceId is string {

    if (
        typeof provenanceId !== "string" ||
        !provenanceId.startsWith(
            "discovery-provenance:source:"
        ) ||
        provenanceId.trim().length <=
            "discovery-provenance:source:".length
    ) {

        throw new TypeError(
            "Discovery provenance persistence requires a valid River provenance identifier."
        );

    }

}


function resolveProvenancePath(
    rootDirectory:
        string,
    provenanceId:
        string
): string {

    assertProvenanceId(
        provenanceId
    );

    const provenanceRoot =
        resolve(
            rootDirectory,
            "content-source-discovery-provenance"
        );

    const encodedId =
        encodeURIComponent(
            provenanceId
        );

    const candidate =
        resolve(
            provenanceRoot,
            `${encodedId}.json`
        );

    if (
        candidate !== provenanceRoot &&
        !candidate.startsWith(
            `${provenanceRoot}${sep}`
        )
    ) {

        throw new TypeError(
            "Discovery provenance path escaped the configured persistence root."
        );

    }

    return candidate;

}


function parsePersistedRecord(
    serialized:
        string,
    requestedProvenanceId:
        string
): ContentSourceDiscoveryProvenanceRecord {

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                serialized
            );

    } catch {

        throw new TypeError(
            "Persisted discovery provenance contains malformed JSON."
        );

    }

    try {

        assertContentSourceDiscoveryProvenanceRecord(
            parsed
        );

    } catch {

        throw new TypeError(
            "Persisted discovery provenance failed authoritative validation."
        );

    }

    if (
        parsed.provenanceId !==
        requestedProvenanceId
    ) {

        throw new TypeError(
            "Persisted discovery provenance identity does not match the requested River provenance identity."
        );

    }

    return parsed;

}


export class FileSystemContentSourceDiscoveryProvenancePersistence
implements ContentSourceDiscoveryProvenancePersistence {

    public constructor(
        private readonly rootDirectory:
            string
    ) {

        if (
            typeof rootDirectory !== "string" ||
            rootDirectory.trim().length === 0
        ) {

            throw new TypeError(
                "Discovery provenance persistence root is required."
            );

        }

    }


    public async persist(
        record:
            ContentSourceDiscoveryProvenanceRecord
    ): Promise<string> {

        assertContentSourceDiscoveryProvenanceRecord(
            record
        );

        const targetPath =
            resolveProvenancePath(
                this.rootDirectory,
                record.provenanceId
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
        provenanceId:
            string
    ): Promise<ContentSourceDiscoveryProvenanceRecord> {

        const targetPath =
            resolveProvenancePath(
                this.rootDirectory,
                provenanceId
            );

        const serialized =
            await readFile(
                targetPath,
                "utf8"
            );

        return parsePersistedRecord(
            serialized,
            provenanceId
        );

    }

}


export function createFileSystemContentSourceDiscoveryProvenancePersistence(
    rootDirectory:
        string
): ContentSourceDiscoveryProvenancePersistence {

    return new FileSystemContentSourceDiscoveryProvenancePersistence(
        rootDirectory
    );

}

import {
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    resolve,
    sep
} from "node:path";

import type {
    KnowledgeGraph
} from "../types";

import {
    validateKnowledgeGraph
} from "../validation";


export interface KnowledgeGraphPersistence {

    persist(
        key: string,
        graph: KnowledgeGraph
    ): Promise<void>;

    retrieve(
        key: string
    ): Promise<KnowledgeGraph>;

}


export interface FilesystemKnowledgeGraphPersistenceOptions {

    readonly rootDirectory: string;

}


function requirePersistenceKey(
    key: string
): string {

    const normalized =
        key.trim();

    if (
        normalized.length === 0 ||
        normalized !== key ||
        normalized === "." ||
        normalized === ".." ||
        normalized.includes("/") ||
        normalized.includes("\\") ||
        normalized.includes("\0")
    ) {

        throw new Error(
            "Knowledge graph persistence key is invalid."
        );

    }

    return normalized;

}


function assertGraphShape(
    value: unknown
): asserts value is KnowledgeGraph {

    if (
        typeof value !== "object" ||
        value === null
    ) {

        throw new Error(
            "Persisted knowledge graph has invalid structure."
        );

    }

    const candidate =
        value as Record<string, unknown>;

    if (
        !Array.isArray(candidate.nodes) ||
        !Array.isArray(candidate.relations) ||
        !Array.isArray(candidate.claims) ||
        !Array.isArray(candidate.revisions)
    ) {

        throw new Error(
            "Persisted knowledge graph has invalid structure."
        );

    }

}


function assertValidKnowledgeGraph(
    graph: KnowledgeGraph
): void {

    const validation =
        validateKnowledgeGraph(
            graph
        );

    const errors =
        validation.issues.filter(
            (item) => {
                return (
                    item.severity ===
                    "error"
                );
            }
        );

    if (
        errors.length >
        0
    ) {

        throw new Error(
            `Knowledge graph validation failed: ${errors
                .map(
                    (item) => {
                        return (
                            `${item.code}: ${item.message}`
                        );
                    }
                )
                .join("; ")}`
        );

    }

}


export class FilesystemKnowledgeGraphPersistence
implements KnowledgeGraphPersistence {

    private readonly rootDirectory:
        string;


    public constructor(
        options: FilesystemKnowledgeGraphPersistenceOptions
    ) {

        this.rootDirectory =
            resolve(
                options.rootDirectory
            );

    }


    public async persist(
        key: string,
        graph: KnowledgeGraph
    ): Promise<void> {

        assertValidKnowledgeGraph(
            graph
        );

        const path =
            this.resolvePath(
                key
            );

        await mkdir(
            this.rootDirectory,
            {
                recursive: true
            }
        );

        await writeFile(
            path,
            `${JSON.stringify(
                graph,
                null,
                2
            )}\n`,
            "utf8"
        );

    }


    public async retrieve(
        key: string
    ): Promise<KnowledgeGraph> {

        const path =
            this.resolvePath(
                key
            );

        let serialized:
            string;

        try {

            serialized =
                await readFile(
                    path,
                    "utf8"
                );

        } catch {

            throw new Error(
                "Persisted knowledge graph could not be retrieved."
            );

        }

        let parsed:
            unknown;

        try {

            parsed =
                JSON.parse(
                    serialized
                );

        } catch {

            throw new Error(
                "Persisted knowledge graph contains malformed JSON."
            );

        }

        assertGraphShape(
            parsed
        );

        assertValidKnowledgeGraph(
            parsed
        );

        return parsed;

    }


    private resolvePath(
        key: string
    ): string {

        const normalizedKey =
            requirePersistenceKey(
                key
            );

        const path =
            resolve(
                this.rootDirectory,
                `${normalizedKey}.json`
            );

        const containedPrefix =
            this.rootDirectory.endsWith(
                sep
            )
                ? this.rootDirectory
                : `${this.rootDirectory}${sep}`;

        if (
            !path.startsWith(
                containedPrefix
            )
        ) {

            throw new Error(
                "Knowledge graph persistence path escapes configured root."
            );

        }

        return path;

    }

}


export function createFilesystemKnowledgeGraphPersistence(
    options: FilesystemKnowledgeGraphPersistenceOptions
): KnowledgeGraphPersistence {

    return new FilesystemKnowledgeGraphPersistence(
        options
    );

}

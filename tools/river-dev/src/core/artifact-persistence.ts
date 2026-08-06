import {
    mkdir,
    open
} from "node:fs/promises";

import {
    dirname,
    join,
    relative,
    resolve
} from "node:path";

import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


export type RiverDevPersistedArtifactType =
    | "proposal"
    | "manifest";


export interface RiverDevArtifactPersistenceRequest {

    readonly repositoryRoot:
        string;

    readonly artifactRoot:
        string;

    readonly proposal:
        RiverDevImplementationProposal;

    readonly manifest:
        RiverDevImplementationManifest |
        null;

}


export interface RiverDevPreparedArtifact {

    readonly type:
        RiverDevPersistedArtifactType;

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly content:
        string;

}


export interface RiverDevArtifactPersistencePreparation {

    readonly proposal:
        RiverDevPreparedArtifact;

    readonly manifest:
        RiverDevPreparedArtifact |
        null;

    readonly artifactCount:
        number;

    readonly implementationWritesPerformed:
        false;

}


function sanitizeIdentifier(
    value:
        string
): string {

    const sanitized =
        value
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9._-]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );

    if (
        sanitized.length ===
        0
    ) {
        throw new TypeError(
            "Artifact identifier cannot be empty after sanitization."
        );
    }

    return sanitized;

}


export function serializeArtifact(
    value:
        unknown
): string {

    return `${JSON.stringify(
        value,
        null,
        2
    )}\n`;

}


export function createArtifactRepositoryPath(
    artifactRoot:
        string,
    type:
        RiverDevPersistedArtifactType,
    identifier:
        string
): string {

    const normalizedRoot =
        artifactRoot
            .replace(
                /\\/g,
                "/"
            )
            .replace(
                /\/+$/g,
                ""
            );

    if (
        normalizedRoot.length ===
        0
    ) {
        throw new TypeError(
            "Artifact root cannot be empty."
        );
    }

    return [
        normalizedRoot,
        type,
        `${sanitizeIdentifier(
            identifier
        )}.json`
    ].join(
        "/"
    );

}


export function prepareArtifactPersistence(
    request:
        RiverDevArtifactPersistenceRequest
): RiverDevArtifactPersistencePreparation {

    const proposalRepositoryPath =
        createArtifactRepositoryPath(
            request.artifactRoot,
            "proposal",
            request.proposal.proposalId
        );

    const proposal:
        RiverDevPreparedArtifact =
        {
            type:
                "proposal",

            repositoryPath:
                proposalRepositoryPath,

            absolutePath:
                join(
                    request.repositoryRoot,
                    proposalRepositoryPath
                ),

            content:
                serializeArtifact(
                    request.proposal
                )
        };

    if (
        request.manifest ===
        null
    ) {
        return {
            proposal,
            manifest:
                null,
            artifactCount:
                1,
            implementationWritesPerformed:
                false
        };
    }

    if (
        request.proposal.approved !==
        true
    ) {
        throw new TypeError(
            "Manifest persistence requires an approved proposal."
        );
    }

    const manifestRepositoryPath =
        createArtifactRepositoryPath(
            request.artifactRoot,
            "manifest",
            request.manifest.implementationId
        );

    const manifest:
        RiverDevPreparedArtifact =
        {
            type:
                "manifest",

            repositoryPath:
                manifestRepositoryPath,

            absolutePath:
                join(
                    request.repositoryRoot,
                    manifestRepositoryPath
                ),

            content:
                serializeArtifact(
                    request.manifest
                )
        };

    return {
        proposal,
        manifest,
        artifactCount:
            2,
        implementationWritesPerformed:
            false
    };

}

export interface RiverDevPersistedArtifact {

    readonly type:
        RiverDevPersistedArtifactType;

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly bytesWritten:
        number;

}


export interface RiverDevArtifactPersistenceResult {

    readonly artifacts:
        readonly RiverDevPersistedArtifact[];

    readonly artifactCount:
        number;

    readonly implementationWritesPerformed:
        false;

}


function assertPathInsideRepository(
    repositoryRoot:
        string,
    absolutePath:
        string
): void {

    const resolvedRoot =
        resolve(
            repositoryRoot
        );

    const resolvedPath =
        resolve(
            absolutePath
        );

    const pathFromRoot =
        relative(
            resolvedRoot,
            resolvedPath
        );

    if (
        pathFromRoot.length ===
            0 ||
        pathFromRoot ===
            ".." ||
        pathFromRoot.startsWith(
            `..${process.platform === "win32" ? "\\" : "/"}`
        ) ||
        resolve(
            resolvedRoot,
            pathFromRoot
        ) !==
            resolvedPath
    ) {
        throw new TypeError(
            `Artifact path escapes the repository boundary: ${absolutePath}`
        );
    }

}


async function persistPreparedArtifact(
    repositoryRoot:
        string,
    artifact:
        RiverDevPreparedArtifact
): Promise<RiverDevPersistedArtifact> {

    assertPathInsideRepository(
        repositoryRoot,
        artifact.absolutePath
    );

    await mkdir(
        dirname(
            artifact.absolutePath
        ),
        {
            recursive:
                true
        }
    );

    let handle;

    try {

        handle =
            await open(
                artifact.absolutePath,
                "wx"
            );

        const writeResult =
            await handle.writeFile(
                artifact.content,
                {
                    encoding:
                        "utf8"
                }
            );

        return {

            type:
                artifact.type,

            repositoryPath:
                artifact.repositoryPath,

            absolutePath:
                artifact.absolutePath,

            bytesWritten:
                writeResult ===
                    undefined
                    ? Buffer.byteLength(
                        artifact.content,
                        "utf8"
                    )
                    : Buffer.byteLength(
                        artifact.content,
                        "utf8"
                    )

        };

    }
    catch (error) {

        if (
            error instanceof Error &&
            "code" in error &&
            error.code ===
                "EEXIST"
        ) {
            throw new TypeError(
                `Artifact already exists: ${artifact.repositoryPath}`
            );
        }

        throw error;

    }
    finally {

        if (
            handle !==
            undefined
        ) {
            await handle.close();
        }

    }

}


export async function persistPreparedArtifacts(
    repositoryRoot:
        string,
    preparation:
        RiverDevArtifactPersistencePreparation
): Promise<RiverDevArtifactPersistenceResult> {

    const preparedArtifacts = [
        preparation.proposal,
        preparation.manifest
    ].filter(
        (
            artifact
        ): artifact is RiverDevPreparedArtifact => {
            return artifact !==
                null;
        }
    );

    const persistedArtifacts:
        RiverDevPersistedArtifact[] =
        [];

    for (
        const artifact of
        preparedArtifacts
    ) {

        persistedArtifacts.push(
            await persistPreparedArtifact(
                repositoryRoot,
                artifact
            )
        );

    }

    return {

        artifacts:
            persistedArtifacts,

        artifactCount:
            persistedArtifacts.length,

        implementationWritesPerformed:
            false

    };

}


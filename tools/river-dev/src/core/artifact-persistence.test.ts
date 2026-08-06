import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";
import {
    join
} from "node:path";

import {
    test
} from "node:test";

import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";

import {
    createArtifactRepositoryPath,
    persistPreparedArtifacts,
    prepareArtifactPersistence,
    serializeArtifact
} from "./artifact-persistence";


function createProposal(
    approved:
        boolean
): RiverDevImplementationProposal {

    return {

        version:
            "1.0.0",

        proposalId:
            "proposal:intent:dev-11-example",

        planId:
            "plan:dev-11-example",

        branch:
            "dev-11-artifact-persistence",

        objective:
            "Persist controlled River Dev artifacts.",

        approved,

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/example.ts",

                content:
                    "export const example = true;\n",

                overwrite:
                    false,

                reason:
                    "Create the controlled example."
            }
        ]

    };

}


function createManifest(): RiverDevImplementationManifest {

    return {

        version:
            "1.0.0",

        implementationId:
            "implementation:proposal:intent:dev-11-example",

        planId:
            "plan:dev-11-example",

        branch:
            "dev-11-artifact-persistence",

        description:
            "Persist controlled River Dev artifacts.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "tools/river-dev/src/generated/example.ts",

                content:
                    "export const example = true;\n",

                overwrite:
                    false
            }
        ]

    };

}


test(
    "creates deterministic proposal artifact paths",
    () => {

        const first =
            createArtifactRepositoryPath(
                ".river-dev/artifacts",
                "proposal",
                "proposal:intent:dev-11-example"
            );

        const second =
            createArtifactRepositoryPath(
                ".river-dev/artifacts/",
                "proposal",
                "proposal:intent:dev-11-example"
            );

        assert.equal(
            first,
            ".river-dev/artifacts/proposal/proposal-intent-dev-11-example.json"
        );

        assert.equal(
            first,
            second
        );

    }
);


test(
    "normalizes Windows artifact roots",
    () => {

        const path =
            createArtifactRepositoryPath(
                ".river-dev\\artifacts\\",
                "manifest",
                "implementation:dev-11"
            );

        assert.equal(
            path,
            ".river-dev/artifacts/manifest/implementation-dev-11.json"
        );

    }
);


test(
    "rejects empty artifact identifiers",
    () => {

        assert.throws(
            () => {
                createArtifactRepositoryPath(
                    ".river-dev/artifacts",
                    "proposal",
                    "!!!"
                );
            },
            /cannot be empty after sanitization/
        );

    }
);


test(
    "serializes artifacts deterministically",
    () => {

        const value =
            {
                version:
                    "1.0.0",

                approved:
                    false
            };

        const first =
            serializeArtifact(
                value
            );

        const second =
            serializeArtifact(
                value
            );

        assert.equal(
            first,
            second
        );

        assert.equal(
            first,
            '{\n  "version": "1.0.0",\n  "approved": false\n}\n'
        );

    }
);


test(
    "prepares proposal persistence without a manifest",
    () => {

        const repositoryRoot =
            "C:\\repository";

        const result =
            prepareArtifactPersistence(
                {
                    repositoryRoot,

                    artifactRoot:
                        ".river-dev/artifacts",

                    proposal:
                        createProposal(
                            false
                        ),

                    manifest:
                        null
                }
            );

        assert.equal(
            result.artifactCount,
            1
        );

        assert.equal(
            result.proposal.type,
            "proposal"
        );

        assert.equal(
            result.proposal.repositoryPath,
            ".river-dev/artifacts/proposal/proposal-intent-dev-11-example.json"
        );

        assert.equal(
            result.proposal.absolutePath,
            join(
                repositoryRoot,
                ".river-dev/artifacts/proposal/proposal-intent-dev-11-example.json"
            )
        );

        assert.equal(
            result.manifest,
            null
        );

        assert.equal(
            result.implementationWritesPerformed,
            false
        );

    }
);


test(
    "prepares proposal and manifest after approval",
    () => {

        const result =
            prepareArtifactPersistence(
                {
                    repositoryRoot:
                        "C:\\repository",

                    artifactRoot:
                        ".river-dev/artifacts",

                    proposal:
                        createProposal(
                            true
                        ),

                    manifest:
                        createManifest()
                }
            );

        assert.equal(
            result.artifactCount,
            2
        );

        assert.ok(
            result.manifest
        );

        assert.equal(
            result.manifest.type,
            "manifest"
        );

        assert.equal(
            result.manifest.repositoryPath,
            ".river-dev/artifacts/manifest/implementation-proposal-intent-dev-11-example.json"
        );

        assert.match(
            result.proposal.content,
            /"approved": true/
        );

        assert.match(
            result.manifest.content,
            /"implementationId": "implementation:proposal:intent:dev-11-example"/
        );

        assert.equal(
            result.implementationWritesPerformed,
            false
        );

    }
);


test(
    "rejects manifest preparation for an unapproved proposal",
    () => {

        assert.throws(
            () => {
                prepareArtifactPersistence(
                    {
                        repositoryRoot:
                            "C:\\repository",

                        artifactRoot:
                            ".river-dev/artifacts",

                        proposal:
                            createProposal(
                                false
                            ),

                        manifest:
                            createManifest()
                    }
                );
            },
            /Manifest persistence requires an approved proposal/
        );

    }
);


test(
    "produces deterministic persistence preparations",
    () => {

        const request =
            {
                repositoryRoot:
                    "C:\\repository",

                artifactRoot:
                    ".river-dev/artifacts",

                proposal:
                    createProposal(
                        true
                    ),

                manifest:
                    createManifest()
            } as const;

        const first =
            prepareArtifactPersistence(
                request
            );

        const second =
            prepareArtifactPersistence(
                request
            );

        assert.deepEqual(
            first,
            second
        );

    }
);

test(
    "persists a prepared proposal artifact",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-artifact-writer-"
                )
            );

        try {

            const preparation =
                prepareArtifactPersistence(
                    {
                        repositoryRoot,

                        artifactRoot:
                            ".river-dev/artifacts",

                        proposal:
                            createProposal(
                                false
                            ),

                        manifest:
                            null
                    }
                );

            const result =
                await persistPreparedArtifacts(
                    repositoryRoot,
                    preparation
                );

            assert.equal(
                result.artifactCount,
                1
            );

            assert.equal(
                result.artifacts[0]?.type,
                "proposal"
            );

            assert.equal(
                result.implementationWritesPerformed,
                false
            );

            const persistedContent =
                await readFile(
                    preparation.proposal.absolutePath,
                    "utf8"
                );

            assert.equal(
                persistedContent,
                preparation.proposal.content
            );

        }
        finally {

            await rm(
                repositoryRoot,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);


test(
    "persists approved proposal and manifest artifacts",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-artifact-writer-approved-"
                )
            );

        try {

            const preparation =
                prepareArtifactPersistence(
                    {
                        repositoryRoot,

                        artifactRoot:
                            ".river-dev/artifacts",

                        proposal:
                            createProposal(
                                true
                            ),

                        manifest:
                            createManifest()
                    }
                );

            const result =
                await persistPreparedArtifacts(
                    repositoryRoot,
                    preparation
                );

            assert.equal(
                result.artifactCount,
                2
            );

            assert.deepEqual(
                result.artifacts.map(
                    (artifact) => {
                        return artifact.type;
                    }
                ),
                [
                    "proposal",
                    "manifest"
                ]
            );

            assert.ok(
                preparation.manifest
            );

            const proposalContent =
                await readFile(
                    preparation.proposal.absolutePath,
                    "utf8"
                );

            const manifestContent =
                await readFile(
                    preparation.manifest.absolutePath,
                    "utf8"
                );

            assert.equal(
                proposalContent,
                preparation.proposal.content
            );

            assert.equal(
                manifestContent,
                preparation.manifest.content
            );

            assert.equal(
                result.implementationWritesPerformed,
                false
            );

        }
        finally {

            await rm(
                repositoryRoot,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);


test(
    "blocks artifact overwrites",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-artifact-writer-overwrite-"
                )
            );

        try {

            const preparation =
                prepareArtifactPersistence(
                    {
                        repositoryRoot,

                        artifactRoot:
                            ".river-dev/artifacts",

                        proposal:
                            createProposal(
                                false
                            ),

                        manifest:
                            null
                    }
                );

            await persistPreparedArtifacts(
                repositoryRoot,
                preparation
            );

            await assert.rejects(
                persistPreparedArtifacts(
                    repositoryRoot,
                    preparation
                ),
                /Artifact already exists/
            );

            const persistedContent =
                await readFile(
                    preparation.proposal.absolutePath,
                    "utf8"
                );

            assert.equal(
                persistedContent,
                preparation.proposal.content
            );

        }
        finally {

            await rm(
                repositoryRoot,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);


test(
    "rejects prepared artifact paths outside the repository",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-artifact-writer-boundary-"
                )
            );

        const outsidePath =
            join(
                repositoryRoot,
                "..",
                "river-dev-outside-artifact.json"
            );

        try {

            const preparation =
                prepareArtifactPersistence(
                    {
                        repositoryRoot,

                        artifactRoot:
                            ".river-dev/artifacts",

                        proposal:
                            createProposal(
                                false
                            ),

                        manifest:
                            null
                    }
                );

            const unsafePreparation =
                {
                    ...preparation,

                    proposal:
                        {
                            ...preparation.proposal,

                            absolutePath:
                                outsidePath
                        }
                };

            await assert.rejects(
                persistPreparedArtifacts(
                    repositoryRoot,
                    unsafePreparation
                ),
                /escapes the repository boundary/
            );

            await writeFile(
                join(
                    repositoryRoot,
                    "repository-remained-usable.txt"
                ),
                "true",
                "utf8"
            );

        }
        finally {

            await rm(
                repositoryRoot,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

            await rm(
                outsidePath,
                {
                    force:
                        true
                }
            );

        }

    }
);


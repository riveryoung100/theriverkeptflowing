import {
    strict as assert
} from "node:assert";

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
    createExecutionPackage,
    createExecutionPackageIdentifier,
    determineExecutionPackageState,
    serializeExecutionPackage,
    validateExecutionPackageRequest
} from "./execution-package";

import type {
    RiverDevExecutionVerificationMetadata
} from "./execution-package";


const BRANCH =
    "dev-12-execution-package";

const PLAN_ID =
    "plan:dev-12-example";

const PROPOSAL_ID =
    "proposal:intent:dev-12-example";

const IMPLEMENTATION_ID =
    "implementation:proposal:intent:dev-12-example";

const IMPLEMENTATION_PATH =
    "tools/river-dev/src/generated/dev-12-example.ts";

const IMPLEMENTATION_CONTENT =
    "export const dev12Example = true;\n";


function createProposal(
    approved:
        boolean =
            true
): RiverDevImplementationProposal {

    return {
        version:
            "1.0.0",

        proposalId:
            PROPOSAL_ID,

        planId:
            PLAN_ID,

        branch:
            BRANCH,

        objective:
            "Create a controlled DEV-12 execution package.",

        approved,

        operations: [
            {
                type:
                    "write-file",

                path:
                    IMPLEMENTATION_PATH,

                content:
                    IMPLEMENTATION_CONTENT,

                overwrite:
                    false,

                reason:
                    "Create the DEV-12 example implementation."
            }
        ]
    };

}


function createManifest(
    overrides:
        Partial<RiverDevImplementationManifest> =
            {}
): RiverDevImplementationManifest {

    const baseManifest:
        RiverDevImplementationManifest =
        {
            version:
                "1.0.0",

            implementationId:
                IMPLEMENTATION_ID,

            planId:
                PLAN_ID,

            branch:
                BRANCH,

            description:
                "Create a controlled DEV-12 execution package.",

            operations: [
                {
                    type:
                        "write-file",

                    path:
                        IMPLEMENTATION_PATH,

                    content:
                        IMPLEMENTATION_CONTENT,

                    overwrite:
                        false
                }
            ]
        };

    return {
        ...baseManifest,
        ...overrides
    };

}


function createVerification(
    passed:
        boolean,
    verifiedAt:
        string |
        null
): RiverDevExecutionVerificationMetadata {

    const verificationExecuted =
        verifiedAt !==
        null;

    return {
        verificationId:
            "verification:dev-12-example",

        passed,

        verifiedAt,

        commands:
            verificationExecuted
                ? [
                    "typecheck",
                    "tests"
                ]
                : [],

        warnings:
            []
    };

}


test(
    "creates a deterministic execution package identifier",
    () => {

        const first =
            createExecutionPackageIdentifier(
                createManifest()
            );

        const second =
            createExecutionPackageIdentifier(
                createManifest()
            );

        assert.equal(
            first,
            "execution-package:implementation-proposal-intent-dev-12-example"
        );

        assert.equal(
            first,
            second
        );

    }
);


test(
    "returns ready-for-verification before verification runs",
    () => {

        assert.equal(
            determineExecutionPackageState(
                createVerification(
                    false,
                    null
                )
            ),
            "ready-for-verification"
        );

    }
);


test(
    "returns blocked after failed verification",
    () => {

        assert.equal(
            determineExecutionPackageState(
                createVerification(
                    false,
                    "2026-08-06T20:30:00.000Z"
                )
            ),
            "blocked"
        );

    }
);


test(
    "returns ready-for-implementation after passing verification",
    () => {

        assert.equal(
            determineExecutionPackageState(
                createVerification(
                    true,
                    "2026-08-06T20:35:00.000Z"
                )
            ),
            "ready-for-implementation"
        );

    }
);


test(
    "creates a ready-for-verification package",
    () => {

        const result =
            createExecutionPackage(
                {
                    proposal:
                        createProposal(),

                    manifest:
                        createManifest(),

                    verification:
                        createVerification(
                            false,
                            null
                        )
                }
            );

        assert.equal(
            result.executionPackage.state,
            "ready-for-verification"
        );

        assert.equal(
            result.executionPackage.implementationReady,
            false
        );

        assert.equal(
            result.implementationWritesPerformed,
            false
        );

    }
);


test(
    "creates a blocked package after failed verification",
    () => {

        const result =
            createExecutionPackage(
                {
                    proposal:
                        createProposal(),

                    manifest:
                        createManifest(),

                    verification:
                        createVerification(
                            false,
                            "2026-08-06T20:40:00.000Z"
                        )
                }
            );

        assert.equal(
            result.executionPackage.state,
            "blocked"
        );

        assert.equal(
            result.executionPackage.implementationReady,
            false
        );

    }
);


test(
    "creates a ready-for-implementation package",
    () => {

        const result =
            createExecutionPackage(
                {
                    proposal:
                        createProposal(),

                    manifest:
                        createManifest(),

                    verification:
                        createVerification(
                            true,
                            "2026-08-06T20:45:00.000Z"
                        )
                }
            );

        assert.equal(
            result.executionPackage.state,
            "ready-for-implementation"
        );

        assert.equal(
            result.executionPackage.implementationReady,
            true
        );

        assert.equal(
            result.executionPackage.packageId,
            "execution-package:implementation-proposal-intent-dev-12-example"
        );

        assert.equal(
            result.executionPackage.implementationWritesPerformed,
            false
        );

    }
);


test(
    "serializes execution packages deterministically",
    () => {

        const result =
            createExecutionPackage(
                {
                    proposal:
                        createProposal(),

                    manifest:
                        createManifest(),

                    verification:
                        createVerification(
                            true,
                            "2026-08-06T20:50:00.000Z"
                        )
                }
            );

        const first =
            serializeExecutionPackage(
                result.executionPackage
            );

        const second =
            serializeExecutionPackage(
                result.executionPackage
            );

        assert.equal(
            result.serialized,
            first
        );

        assert.equal(
            first,
            second
        );

        assert.equal(
            first.endsWith(
                "\n"
            ),
            true
        );

    }
);


test(
    "rejects an unapproved proposal",
    () => {

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(
                                false
                            ),

                        manifest:
                            createManifest(),

                        verification:
                            createVerification(
                                false,
                                null
                            )
                    }
                );
            },
            /requires an approved proposal/
        );

    }
);


test(
    "rejects proposal and manifest plan mismatches",
    () => {

        assert.throws(
            () => {
                validateExecutionPackageRequest(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            createManifest(
                                {
                                    planId:
                                        "plan:another"
                                }
                            ),

                        verification:
                            createVerification(
                                false,
                                null
                            )
                    }
                );
            },
            /plan identifiers do not match/
        );

    }
);


test(
    "rejects proposal and manifest branch mismatches",
    () => {

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            createManifest(
                                {
                                    branch:
                                        "another-branch"
                                }
                            ),

                        verification:
                            createVerification(
                                false,
                                null
                            )
                    }
                );
            },
            /branches do not match/
        );

    }
);


test(
    "rejects operation count mismatches",
    () => {

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            createManifest(
                                {
                                    operations:
                                        []
                                }
                            ),

                        verification:
                            createVerification(
                                false,
                                null
                            )
                    }
                );
            },
            /operation counts do not match/
        );

    }
);


test(
    "rejects operation content mismatches",
    () => {

        const mismatchedManifest =
            createManifest(
                {
                    operations: [
                        {
                            type:
                                "write-file",

                            path:
                                IMPLEMENTATION_PATH,

                            content:
                                "export const dev12Example = false;\n",

                            overwrite:
                                false
                        }
                    ]
                }
            );

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            mismatchedManifest,

                        verification:
                            createVerification(
                                false,
                                null
                            )
                    }
                );
            },
            /operation mismatch at index 0/
        );

    }
);


test(
    "requires a timestamp for passing verification",
    () => {

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            createManifest(),

                        verification:
                            {
                                verificationId:
                                    "verification:invalid",

                                passed:
                                    true,

                                verifiedAt:
                                    null,

                                commands:
                                    [
                                        "typecheck"
                                    ],

                                warnings:
                                    []
                            }
                    }
                );
            },
            /requires a verification timestamp/
        );

    }
);


test(
    "rejects completed commands before verification runs",
    () => {

        assert.throws(
            () => {
                createExecutionPackage(
                    {
                        proposal:
                            createProposal(),

                        manifest:
                            createManifest(),

                        verification:
                            {
                                verificationId:
                                    "verification:unexecuted",

                                passed:
                                    false,

                                verifiedAt:
                                    null,

                                commands:
                                    [
                                        "typecheck"
                                    ],

                                warnings:
                                    []
                            }
                    }
                );
            },
            /cannot contain completed commands/
        );

    }
);


test(
    "clones package inputs",
    () => {

        const proposal =
            createProposal();

        const manifest =
            createManifest();

        const verification =
            createVerification(
                true,
                "2026-08-06T20:55:00.000Z"
            );

        const result =
            createExecutionPackage(
                {
                    proposal,
                    manifest,
                    verification
                }
            );

        assert.notEqual(
            result.executionPackage.proposal,
            proposal
        );

        assert.notEqual(
            result.executionPackage.manifest,
            manifest
        );

        assert.notEqual(
            result.executionPackage.verification,
            verification
        );

        assert.deepEqual(
            result.executionPackage.proposal,
            proposal
        );

        assert.deepEqual(
            result.executionPackage.manifest,
            manifest
        );

        assert.deepEqual(
            result.executionPackage.verification,
            verification
        );

    }
);


test(
    "produces deterministic package results",
    () => {

        const request =
            {
                proposal:
                    createProposal(),

                manifest:
                    createManifest(),

                verification:
                    createVerification(
                        true,
                        "2026-08-06T21:00:00.000Z"
                    )
            } as const;

        assert.deepEqual(
            createExecutionPackage(
                request
            ),
            createExecutionPackage(
                request
            )
        );

    }
);

import test from "node:test";
import assert from "node:assert/strict";

import type {
    RiverDevContextScope,
    RiverDevProductionExecutionAuthorityInputBoundaryFoundationInput
} from "../types";

import {
    establishProductionExecutionAuthorityInputBoundaryFoundation
} from "./production-execution-authority-input-boundary-foundation";


function buildApprovedScope(): RiverDevContextScope {

    return {
        modifiablePaths:
            [
                "tools/river-dev/src/core/example.ts"
            ],

        creatablePaths:
            [],

        excludedPaths:
            []
    };

}


function buildInput(
    overrides:
        Partial<RiverDevProductionExecutionAuthorityInputBoundaryFoundationInput> = {}
): RiverDevProductionExecutionAuthorityInputBoundaryFoundationInput {

    return {
        humanAuthorization: {
            authorized:
                true,

            authorizedBy:
                "river",

            authorizationId:
                "human-auth-1",

            authorizationSignals: [
                "human-approved"
            ]
        },

        repositoryAuthorization: {
            authorized:
                true,

            repositoryRoot:
                "C:/repo",

            authorizationId:
                "repo-auth-1",

            authorizationSignals: [
                "repository-approved"
            ]
        },

        approvedScope:
            buildApprovedScope(),

        approvalEvidence: {
            approved:
                true,

            approvedBy:
                "river",

            approvalId:
                "approval-1",

            approvalSignals: [
                "governance-approved"
            ]
        },

        requestedMode:
            "apply",

        ...overrides
    };

}


test(
    "establishes ready production authority input from complete explicit evidence",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput()
            );

        assert.equal(
            result.trusted,
            true
        );

        assert.equal(
            result.ready,
            true
        );

        assert.equal(
            result.authorityState,
            "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY"
        );

        assert.deepEqual(
            result.blockedReasons,
            []
        );

    }
);


test(
    "requested apply is not authorization",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    requestedMode:
                        "apply"
                })
            );

        assert.equal(
            result.requestedMode,
            "apply"
        );

        assert.equal(
            result.requestedApplyIsAuthorization,
            false
        );

        assert.equal(
            result.createsExecutionAuthorization,
            false
        );

        assert.equal(
            result.upgradesExecutionAuthorization,
            false
        );

        assert.equal(
            result.synthesizesExecutionAuthorization,
            false
        );

    }
);


test(
    "dry-run carries authority evidence without execution authority",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    requestedMode:
                        "dry-run"
                })
            );

        assert.equal(
            result.ready,
            true
        );

        assert.equal(
            result.requestedMode,
            "dry-run"
        );

        assert.equal(
            result.mayExecuteOperation,
            false
        );

        assert.equal(
            result.mayModifyRepository,
            false
        );

    }
);


test(
    "missing human authorization fails closed",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    humanAuthorization:
                        null
                })
            );

        assert.equal(
            result.ready,
            false
        );

        assert.equal(
            result.authorityState,
            "PRODUCTION_EXECUTION_AUTHORITY_INPUT_BLOCKED"
        );

        assert.ok(
            result.blockedReasons.includes(
                "Explicit human authorization evidence is required."
            )
        );

    }
);


test(
    "missing repository authorization fails closed",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    repositoryAuthorization:
                        null
                })
            );

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Explicit repository authorization evidence is required."
            )
        );

    }
);


test(
    "missing approved execution scope fails closed",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    approvedScope:
                        null
                })
            );

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Approved execution scope is required."
            )
        );

    }
);


test(
    "missing governance approval fails closed",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput({
                    approvalEvidence:
                        null
                })
            );

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Explicit governance approval evidence is required."
            )
        );

    }
);


test(
    "negative human authorization fails closed",
    () => {

        const input =
            buildInput();

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation({
                ...input,

                humanAuthorization: {
                    ...input.humanAuthorization!,

                    authorized:
                        false
                }
            });

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Human authorization must be affirmative."
            )
        );

    }
);


test(
    "negative repository authorization fails closed",
    () => {

        const input =
            buildInput();

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation({
                ...input,

                repositoryAuthorization: {
                    ...input.repositoryAuthorization!,

                    authorized:
                        false
                }
            });

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Repository authorization must be affirmative."
            )
        );

    }
);


test(
    "negative governance approval fails closed",
    () => {

        const input =
            buildInput();

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation({
                ...input,

                approvalEvidence: {
                    ...input.approvalEvidence!,

                    approved:
                        false
                }
            });

        assert.equal(
            result.ready,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "Governance approval must be affirmative."
            )
        );

    }
);


test(
    "authority input foundation cannot construct or invoke DEV-317 through DEV-319",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput()
            );

        assert.equal(
            result.mayConstructDev317AcquisitionInput,
            false
        );

        assert.equal(
            result.mayInvokeDev317,
            false
        );

        assert.equal(
            result.mayInvokeDev318,
            false
        );

        assert.equal(
            result.mayInvokeDev319,
            false
        );

    }
);


test(
    "authority input foundation grants no repository or external side-effect authority",
    () => {

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                buildInput()
            );

        assert.equal(result.mayInvokeExecutor, false);
        assert.equal(result.mayExecuteOperation, false);
        assert.equal(result.mayModifyRepository, false);
        assert.equal(result.mayDeleteRepositoryContent, false);
        assert.equal(result.mayStageRepositoryChanges, false);
        assert.equal(result.mayCommitRepositoryChanges, false);
        assert.equal(result.mayPushRepositoryChanges, false);
        assert.equal(result.mayDeploy, false);
        assert.equal(result.mayAccessSecrets, false);
        assert.equal(result.mayUseNetwork, false);
        assert.equal(result.mayInvokeShell, false);

    }
);


test(
    "authority input foundation preserves evidence and approved scope",
    () => {

        const input =
            buildInput();

        const result =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                input
            );

        assert.deepEqual(
            result.humanAuthorization,
            input.humanAuthorization
        );

        assert.deepEqual(
            result.repositoryAuthorization,
            input.repositoryAuthorization
        );

        assert.deepEqual(
            result.approvedScope,
            input.approvedScope
        );

        assert.deepEqual(
            result.approvalEvidence,
            input.approvalEvidence
        );

    }
);


test(
    "authority input foundation is deterministic",
    () => {

        const input =
            buildInput();

        const first =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                input
            );

        const second =
            establishProductionExecutionAuthorityInputBoundaryFoundation(
                input
            );

        assert.deepEqual(
            first,
            second
        );

    }
);
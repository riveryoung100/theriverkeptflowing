import assert from "node:assert/strict";
import test from "node:test";

import {
  createProductionExecutionAuthorityCompositionFoundation
} from "./production-execution-authority-composition-foundation";

import type {
  RiverDevProductionExecutionAuthorityInputBoundaryFoundation
} from "../types";

function createAuthorityInput(
  overrides:
    Partial<RiverDevProductionExecutionAuthorityInputBoundaryFoundation> = {}
): RiverDevProductionExecutionAuthorityInputBoundaryFoundation {
  return {
    version:
      "DEV-321",

    source:
      "production-execution-authority-input-boundary-foundation",

    objective:
      "Carry explicit production execution authority inputs without creating or broadening authorization.",

    trusted:
      true,

    ready:
      true,

    requestedMode:
      "apply",

    humanAuthorization: {
      authorized:
        true,
      authorizedBy:
        "human-approver",
      authorizationId:
        "human-authorization-1",
      authorizationSignals: [
        "explicit-human-authorization"
      ]
    },

    repositoryAuthorization: {
      authorized:
        true,
      repositoryRoot:
        "C:\\repository",
      authorizationId:
        "repository-authorization-1",
      authorizationSignals: [
        "explicit-repository-authorization"
      ]
    },

    approvedScope: {
      modifiablePaths: [
        "tools/river-dev/src/core/example.ts"
      ],
      creatablePaths: [],
      excludedPaths: []
    },

    approvalEvidence: {
      approved:
        true,
      approvedBy:
        "governance-approver",
      approvalId:
        "approval-1",
      approvalSignals: [
        "explicit-governance-approval"
      ]
    },

    authorityState:
      "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY",

    provenance: [
      "DEV-321 authority evidence"
    ],

    blockedReasons:
      [],

    requestedApplyIsAuthorization:
      false,

    createsExecutionAuthorization:
      false,

    upgradesExecutionAuthorization:
      false,

    synthesizesExecutionAuthorization:
      false,

    broadensApprovedScope:
      false,

    mayConstructDev317AcquisitionInput:
      false,

    mayInvokeDev317:
      false,

    mayInvokeDev318:
      false,

    mayInvokeDev319:
      false,

    mayExecuteOperation:
      false,

    mayInvokeExecutor:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommitRepositoryChanges:
      false,

    mayPushRepositoryChanges:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayUseNetwork:
      false,

    mayInvokeShell:
      false,

    ...overrides
  };
}

test(
  "composes trusted ready DEV-321 production authority evidence",
  () => {
    const authorityInput =
      createAuthorityInput();

    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput
      });

    assert.equal(
      result.trusted,
      true
    );

    assert.equal(
      result.ready,
      true
    );

    assert.equal(
      result.compositionState,
      "PRODUCTION_EXECUTION_AUTHORITY_COMPOSED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "preserves DEV-321 authority evidence exactly",
  () => {
    const authorityInput =
      createAuthorityInput();

    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput
      });

    assert.deepEqual(
      result.humanAuthorization,
      authorityInput.humanAuthorization
    );

    assert.deepEqual(
      result.repositoryAuthorization,
      authorityInput.repositoryAuthorization
    );

    assert.deepEqual(
      result.approvedScope,
      authorityInput.approvedScope
    );

    assert.deepEqual(
      result.approvalEvidence,
      authorityInput.approvalEvidence
    );
  }
);

test(
  "fails closed when DEV-321 authority input is untrusted",
  () => {
    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput({
            trusted:
              false
          })
      });

    assert.equal(
      result.trusted,
      false
    );

    assert.equal(
      result.ready,
      false
    );

    assert.equal(
      result.compositionState,
      "PRODUCTION_EXECUTION_AUTHORITY_COMPOSITION_BLOCKED"
    );

    assert.ok(
      result.blockedReasons.includes(
        "production execution authority composition requires trusted DEV-321 authority input"
      )
    );
  }
);

test(
  "fails closed when DEV-321 authority input is not ready",
  () => {
    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput({
            ready:
              false
          })
      });

    assert.equal(
      result.ready,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "production execution authority composition requires ready DEV-321 authority input"
      )
    );
  }
);

test(
  "preserves predecessor blockers and fails closed",
  () => {
    const predecessorBlocker =
      "DEV-321 predecessor blocker";

    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput({
            blockedReasons: [
              predecessorBlocker
            ]
          })
      });

    assert.equal(
      result.trusted,
      false
    );

    assert.equal(
      result.ready,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        predecessorBlocker
      )
    );
  }
);

test(
  "apply request does not create execution authorization",
  () => {
    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput({
            requestedMode:
              "apply"
          })
      });

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

    assert.equal(
      result.broadensApprovedScope,
      false
    );
  }
);

test(
  "composition invokes no authorization or execution stage",
  () => {
    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput()
      });

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

    assert.equal(
      result.mayExecuteOperation,
      false
    );

    assert.equal(
      result.mayInvokeExecutor,
      false
    );
  }
);

test(
  "composition grants no repository shell network or deployment authority",
  () => {
    const result =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput:
          createAuthorityInput()
      });

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
  "produces deterministic composition output",
  () => {
    const authorityInput =
      createAuthorityInput();

    const first =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput
      });

    const second =
      createProductionExecutionAuthorityCompositionFoundation({
        authorityInput
      });

    assert.deepEqual(
      first,
      second
    );
  }
);

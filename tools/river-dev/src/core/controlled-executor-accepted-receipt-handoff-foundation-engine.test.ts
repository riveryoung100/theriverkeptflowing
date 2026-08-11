import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult
} from "../types";

import {
  evaluateControlledExecutorAcceptedReceiptHandoffFoundation
} from "./controlled-executor-accepted-receipt-handoff-foundation-engine";

function validAcceptance():
RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult {
  return {
    version:
      "DEV-259",

    source:
      "controlled-executor-verified-receipt-acceptance-foundation-engine",

    objective:
      "Accept verified execution receipt.",

    trusted:
      true,

    ready:
      true,

    accepted:
      true,

    defaultPolicy:
      "DENY",

    acceptanceDecisionOnly:
      true,

    acceptanceState:
      "VERIFIED_RECEIPT_ACCEPTED",

    verification: {
      version:
        "DEV-258"
    } as RiverDevControlledExecutorVerifiedReceiptAcceptanceFoundationResult[
      "verification"
    ],

    receiptState:
      "EXECUTION_SUCCEEDED",

    executedOperation:
      "inspect-approved-repository-state",

    approvedExecutionScope: [
      "C:/repo"
    ],

    provenance: [
      "DEV-258 verified execution receipt",
      "DEV-259 verified receipt acceptance"
    ],

    authorizationBoundaries: [
      "verified receipt acceptance only"
    ],

    scopeBoundaries: [
      "approved execution scope preserved"
    ],

    acceptanceEvidence: [
      "DEV-258 verification version is exact.",
      "DEV-258 verification is trusted.",
      "DEV-258 verification is ready.",
      "DEV-258 receipt is verified.",
      "DEV-258 default policy remains DENY.",
      "DEV-258 remains verification-only.",
      "Embedded receipt version is DEV-257.",
      "Executed operation is approved.",
      "Receipt state is recognized.",
      "Approved execution scope is present.",
      "Verification provenance is present.",
      "Authorization boundaries are present.",
      "Scope boundaries are present.",
      "All prohibited predecessor authorities remain denied."
    ],

    blockedReasons:
      [],

    mayCreateExecutionAuthorization:
      false,

    mayDispatch:
      false,

    mayExecuteOperation:
      false,

    mayInvokeInspectionDependency:
      false,

    mayRetryExecution:
      false,

    mayPersistLifecycleState:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommit:
      false,

    mayPush:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayExpandScope:
      false,

    mayPerformArbitraryShellExecution:
      false,

    mayPerformExternalSideEffects:
      false
  };
}

function evaluate(
  acceptance =
    validAcceptance()
) {
  return evaluateControlledExecutorAcceptedReceiptHandoffFoundation({
    acceptance
  });
}

test(
  "constructs inert handoff from valid DEV-259 acceptance",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);

    assert.equal(
      result.handoffState,
      "ACCEPTED_RECEIPT_HANDOFF_READY"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "preserves deny-by-default handoff-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.handoffConstructionOnly,
      true
    );

    assert.equal(
      result.handoffIsInertData,
      true
    );
  }
);

test(
  "preserves accepted receipt state",
  () => {
    assert.equal(
      evaluate().receiptState,
      "EXECUTION_SUCCEEDED"
    );
  }
);

test(
  "preserves executed operation",
  () => {
    assert.equal(
      evaluate().executedOperation,
      "inspect-approved-repository-state"
    );
  }
);

test(
  "preserves approved execution scope",
  () => {
    assert.deepEqual(
      evaluate().approvedExecutionScope,
      ["C:/repo"]
    );
  }
);

test(
  "preserves provenance",
  () => {
    assert.deepEqual(
      evaluate().provenance,
      [
        "DEV-258 verified execution receipt",
        "DEV-259 verified receipt acceptance"
      ]
    );
  }
);

test(
  "preserves authorization boundaries",
  () => {
    assert.deepEqual(
      evaluate().authorizationBoundaries,
      [
        "verified receipt acceptance only"
      ]
    );
  }
);

test(
  "preserves scope boundaries",
  () => {
    assert.deepEqual(
      evaluate().scopeBoundaries,
      [
        "approved execution scope preserved"
      ]
    );
  }
);

test(
  "rejects wrong DEV-259 version",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        version: string;
      }
    ).version =
      "DEV-999";

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects untrusted DEV-259 acceptance",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects non-ready DEV-259 acceptance",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        ready: boolean;
      }
    ).ready =
      false;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects non-accepted DEV-259 receipt",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        accepted: boolean;
      }
    ).accepted =
      false;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects non-DENY DEV-259 policy",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        defaultPolicy: string;
      }
    ).defaultPolicy =
      "ALLOW";

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects DEV-259 result that is not acceptance-decision-only",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceDecisionOnly: boolean;
      }
    ).acceptanceDecisionOnly =
      false;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects non-accepted DEV-259 acceptance state",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceState: string;
      }
    ).acceptanceState =
      "VERIFIED_RECEIPT_BLOCKED";

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "accepts EXECUTION_FAILED receipt state",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_FAILED";

    assert.equal(
      evaluate(acceptance).ready,
      true
    );
  }
);

test(
  "accepts EXECUTION_NOT_ATTEMPTED receipt state",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    assert.equal(
      evaluate(acceptance).ready,
      true
    );
  }
);

test(
  "rejects unrecognized receipt state",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "UNKNOWN_STATE";

    const result =
      evaluate(acceptance);

    assert.equal(result.ready, false);
    assert.equal(result.receiptState, null);
  }
);

test(
  "rejects missing executed operation",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        executedOperation: string | null;
      }
    ).executedOperation =
      null;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects missing approved execution scope",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        approvedExecutionScope: string[];
      }
    ).approvedExecutionScope =
      [];

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects missing provenance",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        provenance: string[];
      }
    ).provenance =
      [];

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects missing authorization boundaries",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        authorizationBoundaries: string[];
      }
    ).authorizationBoundaries =
      [];

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects missing scope boundaries",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        scopeBoundaries: string[];
      }
    ).scopeBoundaries =
      [];

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects granted execution authorization creation authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayCreateExecutionAuthorization: boolean;
      }
    ).mayCreateExecutionAuthorization =
      true;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects granted execution authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayExecuteOperation: boolean;
      }
    ).mayExecuteOperation =
      true;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects granted repository modification authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayModifyRepository: boolean;
      }
    ).mayModifyRepository =
      true;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects granted scope expansion authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayExpandScope: boolean;
      }
    ).mayExpandScope =
      true;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "rejects granted external side-effect authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayPerformExternalSideEffects: boolean;
      }
    ).mayPerformExternalSideEffects =
      true;

    assert.equal(
      evaluate(acceptance).ready,
      false
    );
  }
);

test(
  "blocked handoff releases no preserved payload",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(acceptance);

    assert.equal(
      result.handoffState,
      "ACCEPTED_RECEIPT_HANDOFF_BLOCKED"
    );

    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);

    assert.deepEqual(
      result.approvedExecutionScope,
      []
    );

    assert.deepEqual(
      result.provenance,
      []
    );

    assert.deepEqual(
      result.authorizationBoundaries,
      []
    );

    assert.deepEqual(
      result.scopeBoundaries,
      []
    );
  }
);

test(
  "ready handoff grants no downstream authority",
  () => {
    const result =
      evaluate();

    assert.equal(
      result.mayCreateExecutionAuthorization,
      false
    );

    assert.equal(
      result.mayAuthorizeDownstreamAction,
      false
    );

    assert.equal(result.mayDispatch, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);

    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );

    assert.equal(result.mayRetryExecution, false);

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayDeleteRepositoryContent, false);
    assert.equal(result.mayStageRepositoryChanges, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
    assert.equal(result.mayAccessSecrets, false);
    assert.equal(result.mayExpandScope, false);

    assert.equal(
      result.mayPerformArbitraryShellExecution,
      false
    );

    assert.equal(
      result.mayPerformExternalSideEffects,
      false
    );

    assert.equal(
      result.futureDownstreamBoundaryRequired,
      true
    );
  }
);

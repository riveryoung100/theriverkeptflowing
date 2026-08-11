import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorDownstreamHandoffVerificationFoundation
} from "./controlled-executor-downstream-handoff-verification-foundation-engine";

import type {
  RiverDevControlledExecutorAcceptedReceiptHandoffFoundation
} from "../types";

function validHandoff():
RiverDevControlledExecutorAcceptedReceiptHandoffFoundation {
  return {
    version:
      "DEV-260",

    source:
      "controlled-executor-accepted-receipt-handoff-foundation-engine",

    objective:
      "Construct an inert handoff from an accepted DEV-259 verified execution receipt decision without granting downstream action authority.",

    trusted:
      true,

    ready:
      true,

    defaultPolicy:
      "DENY",

    handoffConstructionOnly:
      true,

    handoffIsInertData:
      true,

    handoffState:
      "ACCEPTED_RECEIPT_HANDOFF_READY",

    acceptance:
      {} as RiverDevControlledExecutorAcceptedReceiptHandoffFoundation[
        "acceptance"
      ],

    receiptState:
      "EXECUTION_SUCCEEDED",

    executedOperation:
      "inspect-approved-repository-state",

    approvedExecutionScope: [
      "approved-scope"
    ],

    provenance: [
      "verified-provenance"
    ],

    authorizationBoundaries: [
      "verified-authorization-boundary"
    ],

    scopeBoundaries: [
      "verified-scope-boundary"
    ],

    blockedReasons:
      [],

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayDispatch:
      false,

    mayInvokeExecutor:
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
      false,

    futureDownstreamBoundaryRequired:
      true
  };
}

function evaluate(
  handoff =
    validHandoff()
) {
  return evaluateControlledExecutorDownstreamHandoffVerificationFoundation({
    handoff
  });
}

test(
  "verifies valid inert DEV-260 handoff",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.verified, true);

    assert.equal(
      result.verificationState,
      "DOWNSTREAM_HANDOFF_VERIFIED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "preserves deny-by-default verification-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.verificationDecisionOnly,
      true
    );

    assert.equal(
      result.verificationResultIsInertData,
      true
    );
  }
);

test(
  "preserves recognized receipt state",
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
      ["approved-scope"]
    );
  }
);

test(
  "preserves provenance",
  () => {
    assert.deepEqual(
      evaluate().provenance,
      ["verified-provenance"]
    );
  }
);

test(
  "preserves authorization boundaries",
  () => {
    assert.deepEqual(
      evaluate().authorizationBoundaries,
      ["verified-authorization-boundary"]
    );
  }
);

test(
  "preserves scope boundaries",
  () => {
    assert.deepEqual(
      evaluate().scopeBoundaries,
      ["verified-scope-boundary"]
    );
  }
);

test(
  "produces verification evidence",
  () => {
    assert.ok(
      evaluate().verificationEvidence.length > 0
    );
  }
);

test(
  "rejects wrong DEV-260 version",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        version: string;
      }
    ).version =
      "DEV-259";

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects untrusted DEV-260 handoff",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects non-ready DEV-260 handoff",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        ready: boolean;
      }
    ).ready =
      false;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects non-DENY DEV-260 policy",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        defaultPolicy: string;
      }
    ).defaultPolicy =
      "ALLOW";

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects DEV-260 that is not handoff-construction-only",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        handoffConstructionOnly: boolean;
      }
    ).handoffConstructionOnly =
      false;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects DEV-260 handoff that is not inert",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        handoffIsInertData: boolean;
      }
    ).handoffIsInertData =
      false;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects blocked DEV-260 handoff state",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        handoffState: string;
      }
    ).handoffState =
      "ACCEPTED_RECEIPT_HANDOFF_BLOCKED";

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "accepts EXECUTION_FAILED receipt state",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_FAILED";

    assert.equal(
      evaluate(handoff).verified,
      true
    );
  }
);

test(
  "accepts EXECUTION_NOT_ATTEMPTED receipt state",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    assert.equal(
      evaluate(handoff).verified,
      true
    );
  }
);

test(
  "rejects unrecognized receipt state",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "UNKNOWN";

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing executed operation",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        executedOperation: string | null;
      }
    ).executedOperation =
      null;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing approved execution scope",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        approvedExecutionScope: string[];
      }
    ).approvedExecutionScope =
      [];

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing provenance",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        provenance: string[];
      }
    ).provenance =
      [];

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing authorization boundaries",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        authorizationBoundaries: string[];
      }
    ).authorizationBoundaries =
      [];

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing scope boundaries",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        scopeBoundaries: string[];
      }
    ).scopeBoundaries =
      [];

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects granted execution authorization creation authority",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        mayCreateExecutionAuthorization: boolean;
      }
    ).mayCreateExecutionAuthorization =
      true;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects granted downstream authorization authority",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        mayAuthorizeDownstreamAction: boolean;
      }
    ).mayAuthorizeDownstreamAction =
      true;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects granted dispatch authority",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        mayDispatch: boolean;
      }
    ).mayDispatch =
      true;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects granted execution authority",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        mayExecuteOperation: boolean;
      }
    ).mayExecuteOperation =
      true;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejects missing future downstream boundary",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        futureDownstreamBoundaryRequired: boolean;
      }
    ).futureDownstreamBoundaryRequired =
      false;

    assert.equal(
      evaluate(handoff).verified,
      false
    );
  }
);

test(
  "rejected verification releases no preserved payload or evidence",
  () => {
    const handoff =
      validHandoff();

    (
      handoff as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(handoff);

    assert.equal(
      result.verificationState,
      "DOWNSTREAM_HANDOFF_REJECTED"
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

    assert.deepEqual(
      result.verificationEvidence,
      []
    );
  }
);

test(
  "verified result grants no downstream authority",
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

    assert.equal(
      result.mayDispatch,
      false
    );

    assert.equal(
      result.mayInvokeExecutor,
      false
    );

    assert.equal(
      result.mayExecuteOperation,
      false
    );

    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );

    assert.equal(
      result.mayRetryExecution,
      false
    );

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

    assert.equal(
      result.mayModifyRepository,
      false
    );

    assert.equal(
      result.mayDeleteRepositoryContent,
      false
    );

    assert.equal(
      result.mayStageRepositoryChanges,
      false
    );

    assert.equal(
      result.mayCommit,
      false
    );

    assert.equal(
      result.mayPush,
      false
    );

    assert.equal(
      result.mayDeploy,
      false
    );

    assert.equal(
      result.mayAccessSecrets,
      false
    );

    assert.equal(
      result.mayExpandScope,
      false
    );

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

import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundation
} from "./controlled-executor-verified-downstream-handoff-acceptance-foundation-engine";

import type {
  RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult
} from "../types";

function validVerification():
RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult {
  return {
    version:
      "DEV-261",

    source:
      "controlled-executor-downstream-handoff-verification-foundation-engine",

    objective:
      "Verify the integrity and admissibility of an inert DEV-260 accepted-receipt handoff without granting downstream action or execution authority.",

    trusted:
      true,

    ready:
      true,

    verified:
      true,

    defaultPolicy:
      "DENY",

    verificationDecisionOnly:
      true,

    verificationResultIsInertData:
      true,

    verificationState:
      "DOWNSTREAM_HANDOFF_VERIFIED",

    handoff:
      {} as RiverDevControlledExecutorDownstreamHandoffVerificationFoundationResult[
        "handoff"
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

    verificationEvidence: [
      "DEV-260 handoff version is exact.",
      "DEV-260 handoff is trusted.",
      "DEV-260 handoff is ready.",
      "DEV-260 default policy remains DENY.",
      "DEV-260 remains handoff-construction-only.",
      "DEV-260 handoff remains inert data.",
      "DEV-260 handoff state is ready.",
      "DEV-260 preserved receipt state is recognized.",
      "DEV-260 preserved executed operation is present.",
      "DEV-260 approved execution scope is present.",
      "DEV-260 provenance is present.",
      "DEV-260 authorization boundaries are present.",
      "DEV-260 scope boundaries are present.",
      "DEV-260 prohibited authorities remain denied.",
      "DEV-260 requires a future downstream boundary."
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
  verification =
    validVerification()
) {
  return evaluateControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundation({
    verification
  });
}

test(
  "accepts valid verified DEV-261 handoff result",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.accepted, true);

    assert.equal(
      result.acceptanceState,
      "VERIFIED_DOWNSTREAM_HANDOFF_ACCEPTED"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "preserves deny-by-default acceptance-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.acceptanceDecisionOnly, true);
    assert.equal(result.acceptanceResultIsInertData, true);
  }
);

test(
  "preserves verified receipt state",
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
  "preserves verification evidence",
  () => {
    assert.ok(
      evaluate().verificationEvidence.length > 0
    );
  }
);

test(
  "produces acceptance evidence",
  () => {
    assert.ok(
      evaluate().acceptanceEvidence.length > 0
    );
  }
);

test(
  "rejects wrong DEV-261 version",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        version: string;
      }
    ).version =
      "DEV-260";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects untrusted DEV-261 result",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-ready DEV-261 result",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        ready: boolean;
      }
    ).ready =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-verified DEV-261 result",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        verified: boolean;
      }
    ).verified =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-DENY DEV-261 policy",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        defaultPolicy: string;
      }
    ).defaultPolicy =
      "ALLOW";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects DEV-261 result that is not verification-decision-only",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        verificationDecisionOnly: boolean;
      }
    ).verificationDecisionOnly =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects DEV-261 result that is not inert",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        verificationResultIsInertData: boolean;
      }
    ).verificationResultIsInertData =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects rejected DEV-261 verification state",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        verificationState: string;
      }
    ).verificationState =
      "DOWNSTREAM_HANDOFF_REJECTED";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "accepts EXECUTION_FAILED receipt state",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_FAILED";

    assert.equal(
      evaluate(verification).accepted,
      true
    );
  }
);

test(
  "accepts EXECUTION_NOT_ATTEMPTED receipt state",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    assert.equal(
      evaluate(verification).accepted,
      true
    );
  }
);

test(
  "rejects unrecognized receipt state",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "UNKNOWN";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing executed operation",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        executedOperation: string | null;
      }
    ).executedOperation =
      null;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing approved execution scope",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        approvedExecutionScope: string[];
      }
    ).approvedExecutionScope =
      [];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing provenance",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        provenance: string[];
      }
    ).provenance =
      [];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing authorization boundaries",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        authorizationBoundaries: string[];
      }
    ).authorizationBoundaries =
      [];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing scope boundaries",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        scopeBoundaries: string[];
      }
    ).scopeBoundaries =
      [];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing verification evidence",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        verificationEvidence: string[];
      }
    ).verificationEvidence =
      [];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-empty DEV-261 blocked reasons",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        blockedReasons: string[];
      }
    ).blockedReasons =
      ["blocked"];

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted execution authorization authority",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        mayCreateExecutionAuthorization: boolean;
      }
    ).mayCreateExecutionAuthorization =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted downstream authorization authority",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        mayAuthorizeDownstreamAction: boolean;
      }
    ).mayAuthorizeDownstreamAction =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted dispatch authority",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        mayDispatch: boolean;
      }
    ).mayDispatch =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted execution authority",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        mayExecuteOperation: boolean;
      }
    ).mayExecuteOperation =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects missing future downstream boundary",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        futureDownstreamBoundaryRequired: boolean;
      }
    ).futureDownstreamBoundaryRequired =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejected acceptance releases no preserved payload or evidence",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(verification);

    assert.equal(
      result.acceptanceState,
      "VERIFIED_DOWNSTREAM_HANDOFF_REJECTED"
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

    assert.deepEqual(
      result.acceptanceEvidence,
      []
    );
  }
);

test(
  "accepted result grants no downstream authority",
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

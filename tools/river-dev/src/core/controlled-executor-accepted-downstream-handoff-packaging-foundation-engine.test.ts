import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorAcceptedDownstreamHandoffPackagingFoundation
} from "./controlled-executor-accepted-downstream-handoff-packaging-foundation-engine";

import type {
  RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult
} from "../types";

function validAcceptance():
RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult {
  return {
    version:
      "DEV-262",

    source:
      "controlled-executor-verified-downstream-handoff-acceptance-foundation-engine",

    objective:
      "Accept or reject a verified DEV-261 downstream handoff verification result as inert decision data without granting downstream action or execution authority.",

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

    acceptanceResultIsInertData:
      true,

    acceptanceState:
      "VERIFIED_DOWNSTREAM_HANDOFF_ACCEPTED",

    verification:
      {} as RiverDevControlledExecutorVerifiedDownstreamHandoffAcceptanceFoundationResult[
        "verification"
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
      "verification-evidence"
    ],

    acceptanceEvidence: [
      "acceptance-evidence"
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
  acceptance =
    validAcceptance()
) {
  return evaluateControlledExecutorAcceptedDownstreamHandoffPackagingFoundation({
    acceptance
  });
}

test(
  "packages valid accepted DEV-262 handoff result",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.packaged, true);

    assert.equal(
      result.packagingState,
      "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_READY"
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "preserves deny-by-default packaging-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.handoffPackagingOnly, true);
    assert.equal(result.packageIsInertData, true);
  }
);

test(
  "preserves receipt state",
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
    assert.deepEqual(
      evaluate().verificationEvidence,
      ["verification-evidence"]
    );
  }
);

test(
  "preserves acceptance evidence",
  () => {
    assert.deepEqual(
      evaluate().acceptanceEvidence,
      ["acceptance-evidence"]
    );
  }
);

test(
  "produces packaging evidence",
  () => {
    assert.ok(
      evaluate().packagingEvidence.length > 0
    );
  }
);

test(
  "rejects wrong DEV-262 version",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        version: string;
      }
    ).version =
      "DEV-261";

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects untrusted DEV-262 acceptance",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects non-ready DEV-262 acceptance",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects non-accepted DEV-262 result",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects non-DENY DEV-262 policy",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects DEV-262 result that is not acceptance-decision-only",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects DEV-262 result that is not inert",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceResultIsInertData: boolean;
      }
    ).acceptanceResultIsInertData =
      false;

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects rejected DEV-262 acceptance state",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceState: string;
      }
    ).acceptanceState =
      "VERIFIED_DOWNSTREAM_HANDOFF_REJECTED";

    assert.equal(
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
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
      "UNKNOWN";

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
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
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects missing verification evidence",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        verificationEvidence: string[];
      }
    ).verificationEvidence =
      [];

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects missing acceptance evidence",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        acceptanceEvidence: string[];
      }
    ).acceptanceEvidence =
      [];

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects non-empty DEV-262 blocked reasons",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        blockedReasons: string[];
      }
    ).blockedReasons =
      ["blocked"];

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects granted execution authorization authority",
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects granted downstream authorization authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayAuthorizeDownstreamAction: boolean;
      }
    ).mayAuthorizeDownstreamAction =
      true;

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects granted dispatch authority",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        mayDispatch: boolean;
      }
    ).mayDispatch =
      true;

    assert.equal(
      evaluate(acceptance).packaged,
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
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "rejects missing future downstream boundary",
  () => {
    const acceptance =
      validAcceptance();

    (
      acceptance as unknown as {
        futureDownstreamBoundaryRequired: boolean;
      }
    ).futureDownstreamBoundaryRequired =
      false;

    assert.equal(
      evaluate(acceptance).packaged,
      false
    );
  }
);

test(
  "blocked packaging releases no preserved payload or evidence",
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
      result.packagingState,
      "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_BLOCKED"
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

    assert.deepEqual(
      result.packagingEvidence,
      []
    );
  }
);

test(
  "packaged result grants no downstream authority",
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

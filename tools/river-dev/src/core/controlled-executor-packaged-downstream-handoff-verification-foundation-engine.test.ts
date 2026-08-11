import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorPackagedDownstreamHandoffVerificationFoundation
} from "./controlled-executor-packaged-downstream-handoff-verification-foundation-engine";

import type {
  RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult
} from "../types";

function validPackage():
RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult {
  return {
    version:
      "DEV-263",

    source:
      "controlled-executor-accepted-downstream-handoff-packaging-foundation-engine",

    objective:
      "Package an accepted DEV-262 downstream handoff result into inert data for a future downstream boundary without granting downstream action or execution authority.",

    trusted:
      true,

    ready:
      true,

    packaged:
      true,

    defaultPolicy:
      "DENY",

    handoffPackagingOnly:
      true,

    packageIsInertData:
      true,

    packagingState:
      "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_READY",

    acceptance:
      {} as RiverDevControlledExecutorAcceptedDownstreamHandoffPackagingFoundationResult[
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

    verificationEvidence: [
      "verification-evidence"
    ],

    acceptanceEvidence: [
      "acceptance-evidence"
    ],

    packagingEvidence: [
      "packaging-evidence"
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
  packagedHandoff =
    validPackage()
) {
  return evaluateControlledExecutorPackagedDownstreamHandoffVerificationFoundation({
    package:
      packagedHandoff
  });
}

test(
  "verifies valid DEV-263 packaged downstream handoff",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.verified, true);

    assert.equal(
      result.verificationState,
      "PACKAGED_DOWNSTREAM_HANDOFF_VERIFIED"
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

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.packageVerificationOnly, true);
    assert.equal(result.verificationResultIsInertData, true);
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
  "preserves packaging evidence",
  () => {
    assert.deepEqual(
      evaluate().packagingEvidence,
      ["packaging-evidence"]
    );
  }
);

test(
  "produces package verification evidence",
  () => {
    assert.ok(
      evaluate().packageVerificationEvidence.length > 0
    );
  }
);

test(
  "rejects wrong DEV-263 version",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        version: string;
      }
    ).version =
      "DEV-262";

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects untrusted DEV-263 package",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects non-ready DEV-263 package",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        ready: boolean;
      }
    ).ready =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects non-packaged DEV-263 handoff",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        packaged: boolean;
      }
    ).packaged =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects non-DENY DEV-263 policy",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        defaultPolicy: string;
      }
    ).defaultPolicy =
      "ALLOW";

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects DEV-263 package that is not handoff-packaging-only",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        handoffPackagingOnly: boolean;
      }
    ).handoffPackagingOnly =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects DEV-263 package that is not inert",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        packageIsInertData: boolean;
      }
    ).packageIsInertData =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects blocked DEV-263 packaging state",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        packagingState: string;
      }
    ).packagingState =
      "ACCEPTED_DOWNSTREAM_HANDOFF_PACKAGE_BLOCKED";

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing preserved acceptance",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        acceptance: unknown;
      }
    ).acceptance =
      null;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "accepts EXECUTION_FAILED receipt state",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_FAILED";

    assert.equal(
      evaluate(packagedHandoff).verified,
      true
    );
  }
);

test(
  "accepts EXECUTION_NOT_ATTEMPTED receipt state",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    assert.equal(
      evaluate(packagedHandoff).verified,
      true
    );
  }
);

test(
  "rejects unrecognized receipt state",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "UNKNOWN";

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing executed operation",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        executedOperation: string | null;
      }
    ).executedOperation =
      null;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing approved execution scope",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        approvedExecutionScope: string[];
      }
    ).approvedExecutionScope =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing provenance",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        provenance: string[];
      }
    ).provenance =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing authorization boundaries",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        authorizationBoundaries: string[];
      }
    ).authorizationBoundaries =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing scope boundaries",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        scopeBoundaries: string[];
      }
    ).scopeBoundaries =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing verification evidence",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        verificationEvidence: string[];
      }
    ).verificationEvidence =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing acceptance evidence",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        acceptanceEvidence: string[];
      }
    ).acceptanceEvidence =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing packaging evidence",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        packagingEvidence: string[];
      }
    ).packagingEvidence =
      [];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects non-empty DEV-263 blocked reasons",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        blockedReasons: string[];
      }
    ).blockedReasons =
      ["blocked"];

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects granted execution authorization authority",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        mayCreateExecutionAuthorization: boolean;
      }
    ).mayCreateExecutionAuthorization =
      true;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects granted downstream authorization authority",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        mayAuthorizeDownstreamAction: boolean;
      }
    ).mayAuthorizeDownstreamAction =
      true;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects granted dispatch authority",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        mayDispatch: boolean;
      }
    ).mayDispatch =
      true;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects granted execution authority",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        mayExecuteOperation: boolean;
      }
    ).mayExecuteOperation =
      true;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejects missing future downstream boundary",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        futureDownstreamBoundaryRequired: boolean;
      }
    ).futureDownstreamBoundaryRequired =
      false;

    assert.equal(
      evaluate(packagedHandoff).verified,
      false
    );
  }
);

test(
  "rejected verification releases no preserved payload or evidence",
  () => {
    const packagedHandoff =
      validPackage();

    (
      packagedHandoff as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(packagedHandoff);

    assert.equal(
      result.verificationState,
      "PACKAGED_DOWNSTREAM_HANDOFF_REJECTED"
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

    assert.deepEqual(
      result.packageVerificationEvidence,
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

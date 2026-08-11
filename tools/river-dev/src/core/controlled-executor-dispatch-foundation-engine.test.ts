import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorDispatchFoundation
} from "./controlled-executor-dispatch-foundation-engine";

import type {
  RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult
} from "../types";

function buildValidAuthorization():
  RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult {
  return {
    version: "DEV-270",
    trusted: true,
    ready: true,
    dispatchAuthorized: true,
    defaultPolicy: "DENY",
    dispatchAuthorizationDecisionOnly: true,
    dispatchAuthorizationResultIsInertData: true,
    dispatchAuthorizationState: "DISPATCH_AUTHORIZED",

    activeAdmission:
      {} as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["activeAdmission"],

    authorization:
      {} as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["authorization"],

    eligibility:
      {} as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["eligibility"],

    consumption:
      {} as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["consumption"],

    receiptState:
      "EXECUTION_SUCCEEDED" as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["receiptState"],

    executedOperation:
      "inspect-approved-repository-state" as RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult["executedOperation"],

    approvedExecutionScope: ["approved-scope"],
    provenance: ["provenance"],
    authorizationBoundaries: ["authorization-boundary"],
    scopeBoundaries: ["scope-boundary"],
    verificationEvidence: ["verification"],
    acceptanceEvidence: ["acceptance"],
    packagingEvidence: ["packaging"],
    packageVerificationEvidence: ["package-verification"],
    admissionEvidence: ["admission"],
    consumptionEvidence: ["consumption"],
    activeAdmissionEligibilityEvidence: ["eligibility"],
    activeAdmissionAuthorizationEvidence: ["authorization"],
    controlledActiveAdmissionEvidence: ["active-admission"],
    dispatchAuthorizationEvidence: ["dispatch-authorization"],

    blockedReasons: [],

    mayCreateExecutionAuthorization: false,
    mayAuthorizeDownstreamAction: false,
    mayAdmitIntoActiveExecutor: false,
    mayActivateAdmission: false,
    mayDispatch: false,
    mayInvokeExecutor: false,
    mayExecuteOperation: false,
    mayInvokeInspectionDependency: false,
    mayRetryExecution: false,
    mayPersistLifecycleState: false,
    mayModifyRepository: false,
    mayDeleteRepositoryContent: false,
    mayStageRepositoryChanges: false,
    mayCommit: false,
    mayPush: false,
    mayDeploy: false,
    mayAccessSecrets: false,
    mayExpandScope: false,
    mayPerformArbitraryShellExecution: false,
    mayPerformExternalSideEffects: false,
    futureControlledDispatchBoundaryRequired: true,
    futureExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}

test(
  "accepts exact dispatch-authorized DEV-270 predecessor",
  () => {
    const value = buildValidAuthorization();

    const result =
      buildControlledExecutorDispatchFoundation(value);

    assert.equal(result.version, "DEV-271");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.dispatched, true);
    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.controlledDispatchStateOnly, true);

    assert.equal(
      result.dispatchState,
      "CONTROLLED_DISPATCH_ACCEPTED"
    );

    assert.equal(result.dispatchAuthorization, value);

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "controlled dispatch preserves exact predecessor payload",
  () => {
    const value = buildValidAuthorization();

    const result =
      buildControlledExecutorDispatchFoundation(value);

    assert.equal(result.dispatchAuthorization, value);
    assert.equal(result.activeAdmission, value.activeAdmission);
    assert.equal(result.authorization, value.authorization);
    assert.equal(result.eligibility, value.eligibility);
    assert.equal(result.consumption, value.consumption);
    assert.equal(result.receiptState, value.receiptState);
    assert.equal(result.executedOperation, value.executedOperation);

    assert.deepEqual(
      result.approvedExecutionScope,
      value.approvedExecutionScope
    );

    assert.deepEqual(
      result.dispatchAuthorizationEvidence,
      value.dispatchAuthorizationEvidence
    );
  }
);

test(
  "controlled dispatch does not invoke executor",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayInvokeInspectionDependency, false);
  }
);

test(
  "controlled dispatch does not execute operation",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayRetryExecution, false);
  }
);

test(
  "controlled dispatch grants no repository authority",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayDeleteRepositoryContent, false);
    assert.equal(result.mayStageRepositoryChanges, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
  }
);

test(
  "controlled dispatch grants no scope secret shell or external authority",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

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
  }
);

test(
  "controlled dispatch constructs dispatch evidence",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

    assert.ok(
      result.controlledDispatchEvidence.includes(
        "DEV-271:CONTROLLED_DISPATCH_ACCEPTED"
      )
    );

    assert.ok(
      result.controlledDispatchEvidence.includes(
        "DEV-271:EXECUTOR_NOT_INVOKED"
      )
    );
  }
);

test(
  "future invocation and execution boundaries remain mandatory",
  () => {
    const result =
      buildControlledExecutorDispatchFoundation(
        buildValidAuthorization()
      );

    assert.equal(
      result.futureExecutorInvocationBoundaryRequired,
      true
    );

    assert.equal(
      result.futureExecutionBoundaryRequired,
      true
    );
  }
);

test(
  "rejected result releases no predecessor payload",
  () => {
    const value = buildValidAuthorization();

    (
      value as unknown as {
        dispatchAuthorized: false;
      }
    ).dispatchAuthorized = false;

    const result =
      buildControlledExecutorDispatchFoundation(value);

    assert.equal(result.dispatched, false);

    assert.equal(
      result.dispatchState,
      "CONTROLLED_DISPATCH_REJECTED"
    );

    assert.equal(result.dispatchAuthorization, null);
    assert.equal(result.activeAdmission, null);
    assert.equal(result.authorization, null);
    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);
    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);
    assert.deepEqual(result.approvedExecutionScope, []);
    assert.deepEqual(result.provenance, []);
    assert.deepEqual(result.controlledDispatchEvidence, []);
    assert.ok(result.blockedReasons.length > 0);
  }
);

const invalidCases: ReadonlyArray<{
  readonly name: string;
  readonly mutate: (
    value:
      RiverDevControlledExecutorActiveAdmissionDispatchAuthorizationFoundationResult
  ) => void;
  readonly reason: string;
}> = [
  {
    name: "rejects untrusted predecessor",
    mutate: value => {
      (
        value as unknown as {
          trusted: false;
        }
      ).trusted = false;
    },
    reason: "PREDECESSOR_NOT_TRUSTED"
  },
  {
    name: "rejects predecessor not ready",
    mutate: value => {
      (
        value as unknown as {
          ready: false;
        }
      ).ready = false;
    },
    reason: "PREDECESSOR_NOT_READY"
  },
  {
    name: "rejects dispatch not authorized",
    mutate: value => {
      (
        value as unknown as {
          dispatchAuthorized: false;
        }
      ).dispatchAuthorized = false;
    },
    reason: "DISPATCH_NOT_AUTHORIZED"
  },
  {
    name: "rejects unauthorized dispatch state",
    mutate: value => {
      (
        value as unknown as {
          dispatchAuthorizationState:
            "DISPATCH_UNAUTHORIZED";
        }
      ).dispatchAuthorizationState =
        "DISPATCH_UNAUTHORIZED";
    },
    reason:
      "PREDECESSOR_DISPATCH_AUTHORIZATION_NOT_ACCEPTED"
  },
  {
    name: "rejects missing active admission lineage",
    mutate: value => {
      (
        value as unknown as {
          activeAdmission: null;
        }
      ).activeAdmission = null;
    },
    reason: "MISSING_ACTIVE_ADMISSION_LINEAGE"
  },
  {
    name: "rejects missing authorization lineage",
    mutate: value => {
      (
        value as unknown as {
          authorization: null;
        }
      ).authorization = null;
    },
    reason: "MISSING_AUTHORIZATION_LINEAGE"
  },
  {
    name: "rejects missing eligibility lineage",
    mutate: value => {
      (
        value as unknown as {
          eligibility: null;
        }
      ).eligibility = null;
    },
    reason: "MISSING_ELIGIBILITY_LINEAGE"
  },
  {
    name: "rejects missing consumption lineage",
    mutate: value => {
      (
        value as unknown as {
          consumption: null;
        }
      ).consumption = null;
    },
    reason: "MISSING_CONSUMPTION_LINEAGE"
  },
  {
    name: "rejects missing receipt state",
    mutate: value => {
      (
        value as unknown as {
          receiptState: null;
        }
      ).receiptState = null;
    },
    reason: "MISSING_RECEIPT_STATE"
  },
  {
    name: "rejects missing executed operation",
    mutate: value => {
      (
        value as unknown as {
          executedOperation: null;
        }
      ).executedOperation = null;
    },
    reason: "MISSING_EXECUTED_OPERATION"
  },
  {
    name: "rejects empty approved execution scope",
    mutate: value => {
      (
        value as unknown as {
          approvedExecutionScope: readonly string[];
        }
      ).approvedExecutionScope = [];
    },
    reason: "MISSING_APPROVED_EXECUTION_SCOPE"
  },
  {
    name: "rejects empty provenance",
    mutate: value => {
      (
        value as unknown as {
          provenance: readonly string[];
        }
      ).provenance = [];
    },
    reason: "MISSING_PROVENANCE"
  },
  {
    name: "rejects empty authorization boundaries",
    mutate: value => {
      (
        value as unknown as {
          authorizationBoundaries: readonly string[];
        }
      ).authorizationBoundaries = [];
    },
    reason: "MISSING_AUTHORIZATION_BOUNDARIES"
  },
  {
    name: "rejects empty scope boundaries",
    mutate: value => {
      (
        value as unknown as {
          scopeBoundaries: readonly string[];
        }
      ).scopeBoundaries = [];
    },
    reason: "MISSING_SCOPE_BOUNDARIES"
  },
  {
    name: "rejects empty verification evidence",
    mutate: value => {
      (
        value as unknown as {
          verificationEvidence: readonly string[];
        }
      ).verificationEvidence = [];
    },
    reason: "MISSING_VERIFICATION_EVIDENCE"
  },
  {
    name: "rejects empty acceptance evidence",
    mutate: value => {
      (
        value as unknown as {
          acceptanceEvidence: readonly string[];
        }
      ).acceptanceEvidence = [];
    },
    reason: "MISSING_ACCEPTANCE_EVIDENCE"
  },
  {
    name: "rejects empty packaging evidence",
    mutate: value => {
      (
        value as unknown as {
          packagingEvidence: readonly string[];
        }
      ).packagingEvidence = [];
    },
    reason: "MISSING_PACKAGING_EVIDENCE"
  },
  {
    name: "rejects empty package verification evidence",
    mutate: value => {
      (
        value as unknown as {
          packageVerificationEvidence:
            readonly string[];
        }
      ).packageVerificationEvidence = [];
    },
    reason:
      "MISSING_PACKAGE_VERIFICATION_EVIDENCE"
  },
  {
    name: "rejects empty admission evidence",
    mutate: value => {
      (
        value as unknown as {
          admissionEvidence: readonly string[];
        }
      ).admissionEvidence = [];
    },
    reason: "MISSING_ADMISSION_EVIDENCE"
  },
  {
    name: "rejects empty consumption evidence",
    mutate: value => {
      (
        value as unknown as {
          consumptionEvidence: readonly string[];
        }
      ).consumptionEvidence = [];
    },
    reason: "MISSING_CONSUMPTION_EVIDENCE"
  },
  {
    name: "rejects empty eligibility evidence",
    mutate: value => {
      (
        value as unknown as {
          activeAdmissionEligibilityEvidence:
            readonly string[];
        }
      ).activeAdmissionEligibilityEvidence = [];
    },
    reason:
      "MISSING_ACTIVE_ADMISSION_ELIGIBILITY_EVIDENCE"
  },
  {
    name: "rejects empty authorization evidence",
    mutate: value => {
      (
        value as unknown as {
          activeAdmissionAuthorizationEvidence:
            readonly string[];
        }
      ).activeAdmissionAuthorizationEvidence = [];
    },
    reason:
      "MISSING_ACTIVE_ADMISSION_AUTHORIZATION_EVIDENCE"
  },
  {
    name: "rejects empty active-admission evidence",
    mutate: value => {
      (
        value as unknown as {
          controlledActiveAdmissionEvidence:
            readonly string[];
        }
      ).controlledActiveAdmissionEvidence = [];
    },
    reason:
      "MISSING_CONTROLLED_ACTIVE_ADMISSION_EVIDENCE"
  },
  {
    name: "rejects empty dispatch-authorization evidence",
    mutate: value => {
      (
        value as unknown as {
          dispatchAuthorizationEvidence:
            readonly string[];
        }
      ).dispatchAuthorizationEvidence = [];
    },
    reason:
      "MISSING_DISPATCH_AUTHORIZATION_EVIDENCE"
  },
  {
    name: "rejects predecessor blocked reasons",
    mutate: value => {
      (
        value as unknown as {
          blockedReasons: readonly string[];
        }
      ).blockedReasons = ["blocked"];
    },
    reason: "PREDECESSOR_HAS_BLOCKED_REASONS"
  },
  {
    name: "rejects predecessor executor-invocation escalation",
    mutate: value => {
      (
        value as unknown as {
          mayInvokeExecutor: true;
        }
      ).mayInvokeExecutor = true;
    },
    reason:
      "PREDECESSOR_AUTHORITY_BOUNDARY_VIOLATION"
  },
  {
    name: "rejects missing controlled-dispatch boundary requirement",
    mutate: value => {
      (
        value as unknown as {
          futureControlledDispatchBoundaryRequired:
            false;
        }
      ).futureControlledDispatchBoundaryRequired =
        false;
    },
    reason:
      "CONTROLLED_DISPATCH_BOUNDARY_NOT_REQUIRED"
  },
  {
    name: "rejects missing executor invocation boundary",
    mutate: value => {
      (
        value as unknown as {
          futureExecutorInvocationBoundaryRequired:
            false;
        }
      ).futureExecutorInvocationBoundaryRequired =
        false;
    },
    reason:
      "EXECUTOR_INVOCATION_BOUNDARY_NOT_REQUIRED"
  },
  {
    name: "rejects missing execution boundary",
    mutate: value => {
      (
        value as unknown as {
          futureExecutionBoundaryRequired:
            false;
        }
      ).futureExecutionBoundaryRequired =
        false;
    },
    reason:
      "EXECUTION_BOUNDARY_NOT_REQUIRED"
  }
];

for (const invalidCase of invalidCases) {
  test(invalidCase.name, () => {
    const value = buildValidAuthorization();

    invalidCase.mutate(value);

    const result =
      buildControlledExecutorDispatchFoundation(value);

    assert.equal(result.dispatched, false);

    assert.equal(
      result.dispatchState,
      "CONTROLLED_DISPATCH_REJECTED"
    );

    assert.ok(
      result.blockedReasons.includes(
        invalidCase.reason
      )
    );

    assert.equal(result.dispatchAuthorization, null);
    assert.deepEqual(result.controlledDispatchEvidence, []);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
  });
}

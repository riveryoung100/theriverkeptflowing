import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation
} from "./controlled-executor-active-admission-dispatch-authorization-foundation-engine";

import type {
  RiverDevControlledExecutorActiveAdmissionFoundationResult
} from "../types";

function buildValidAdmission():
  RiverDevControlledExecutorActiveAdmissionFoundationResult {
  return {
    version: "DEV-269",
    trusted: true,
    ready: true,
    admitted: true,
    defaultPolicy: "DENY",
    controlledActiveAdmissionOnly: true,
    admissionState: "ACTIVE_ADMISSION_ACCEPTED",

    authorization:
      {} as RiverDevControlledExecutorActiveAdmissionFoundationResult["authorization"],

    eligibility:
      {} as RiverDevControlledExecutorActiveAdmissionFoundationResult["eligibility"],

    consumption:
      {} as RiverDevControlledExecutorActiveAdmissionFoundationResult["consumption"],

    receiptState:
      "EXECUTION_SUCCEEDED" as RiverDevControlledExecutorActiveAdmissionFoundationResult["receiptState"],

    executedOperation:
      "inspect-approved-repository-state" as RiverDevControlledExecutorActiveAdmissionFoundationResult["executedOperation"],

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
    futureDispatchAuthorizationBoundaryRequired: true
  };
}

test(
  "authorizes dispatch decision for exact accepted DEV-269 predecessor",
  () => {
    const value = buildValidAdmission();

    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        value
      );

    assert.equal(result.version, "DEV-270");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.dispatchAuthorized, true);

    assert.equal(
      result.dispatchAuthorizationState,
      "DISPATCH_AUTHORIZED"
    );

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.dispatchAuthorizationDecisionOnly,
      true
    );

    assert.equal(
      result.dispatchAuthorizationResultIsInertData,
      true
    );

    assert.equal(result.activeAdmission, value);

    assert.deepEqual(
      result.blockedReasons,
      []
    );

    assert.ok(
      result.dispatchAuthorizationEvidence.length >
      0
    );
  }
);

test(
  "dispatch authorization is inert and does not dispatch",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        buildValidAdmission()
      );

    assert.equal(result.mayDispatch, false);
  }
);

test(
  "dispatch authorization does not invoke executor or execute operation",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        buildValidAdmission()
      );

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );
  }
);

test(
  "dispatch authorization grants no repository authority",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        buildValidAdmission()
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
  "dispatch authorization grants no scope secret shell or external authority",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        buildValidAdmission()
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
  "authorized result preserves predecessor payload",
  () => {
    const value = buildValidAdmission();

    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        value
      );

    assert.equal(result.activeAdmission, value);
    assert.equal(result.authorization, value.authorization);
    assert.equal(result.eligibility, value.eligibility);
    assert.equal(result.consumption, value.consumption);
    assert.equal(result.receiptState, value.receiptState);
    assert.equal(
      result.executedOperation,
      value.executedOperation
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      value.approvedExecutionScope
    );

    assert.deepEqual(
      result.controlledActiveAdmissionEvidence,
      value.controlledActiveAdmissionEvidence
    );
  }
);

test(
  "unauthorized result releases no predecessor payload",
  () => {
    const value = buildValidAdmission();

    (
      value as unknown as {
        admitted: false;
      }
    ).admitted = false;

    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        value
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.equal(
      result.dispatchAuthorizationState,
      "DISPATCH_UNAUTHORIZED"
    );

    assert.equal(result.activeAdmission, null);
    assert.equal(result.authorization, null);
    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);
    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);

    assert.deepEqual(
      result.approvedExecutionScope,
      []
    );

    assert.deepEqual(result.provenance, []);

    assert.deepEqual(
      result.dispatchAuthorizationEvidence,
      []
    );

    assert.ok(result.blockedReasons.length > 0);
  }
);

test(
  "future execution boundaries remain mandatory",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        buildValidAdmission()
      );

    assert.equal(
      result.futureControlledDispatchBoundaryRequired,
      true
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

const invalidCases: ReadonlyArray<{
  readonly name: string;
  readonly mutate: (
    value:
      RiverDevControlledExecutorActiveAdmissionFoundationResult
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
    name: "rejects predecessor not admitted",
    mutate: value => {
      (
        value as unknown as {
          admitted: false;
        }
      ).admitted = false;
    },
    reason: "PREDECESSOR_NOT_ADMITTED"
  },
  {
    name: "rejects rejected active admission state",
    mutate: value => {
      (
        value as unknown as {
          admissionState:
            "ACTIVE_ADMISSION_REJECTED";
        }
      ).admissionState =
        "ACTIVE_ADMISSION_REJECTED";
    },
    reason:
      "PREDECESSOR_ACTIVE_ADMISSION_NOT_ACCEPTED"
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
    name: "rejects empty controlled active admission evidence",
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
    name: "rejects predecessor dispatch authority escalation",
    mutate: value => {
      (
        value as unknown as {
          mayDispatch: true;
        }
      ).mayDispatch = true;
    },
    reason:
      "PREDECESSOR_AUTHORITY_BOUNDARY_VIOLATION"
  },
  {
    name: "rejects missing dispatch authorization boundary requirement",
    mutate: value => {
      (
        value as unknown as {
          futureDispatchAuthorizationBoundaryRequired:
            false;
        }
      ).futureDispatchAuthorizationBoundaryRequired =
        false;
    },
    reason:
      "DISPATCH_AUTHORIZATION_BOUNDARY_NOT_REQUIRED"
  }
];

for (const invalidCase of invalidCases) {
  test(invalidCase.name, () => {
    const value = buildValidAdmission();

    invalidCase.mutate(value);

    const result =
      buildControlledExecutorActiveAdmissionDispatchAuthorizationFoundation(
        value
      );

    assert.equal(result.dispatchAuthorized, false);

    assert.equal(
      result.dispatchAuthorizationState,
      "DISPATCH_UNAUTHORIZED"
    );

    assert.ok(
      result.blockedReasons.includes(
        invalidCase.reason
      )
    );

    assert.equal(result.activeAdmission, null);

    assert.deepEqual(
      result.dispatchAuthorizationEvidence,
      []
    );

    assert.equal(result.mayDispatch, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
  });
}

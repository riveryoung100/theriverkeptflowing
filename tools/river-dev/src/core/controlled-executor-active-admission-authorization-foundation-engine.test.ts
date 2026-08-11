import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorActiveAdmissionAuthorizationFoundation
} from "./controlled-executor-active-admission-authorization-foundation-engine";

import type {
  RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult
} from "../types";

function buildValidEligibility():
  RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult {
  return {
    version: "DEV-267",
    trusted: true,
    ready: true,
    eligible: true,
    defaultPolicy: "DENY",
    activeAdmissionEligibilityDecisionOnly: true,
    eligibilityResultIsInertData: true,
    eligibilityState: "ACTIVE_ADMISSION_ELIGIBLE",

    consumption:
      {} as RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult["consumption"],

    receiptState:
      "EXECUTION_SUCCEEDED" as RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult["receiptState"],

    executedOperation:
      "inspect-approved-repository-state" as RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult["executedOperation"],

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
    futureActiveAdmissionBoundaryRequired: true
  };
}

test(
  "valid DEV-267 result becomes inert active-admission authorization",
  () => {
    const value = buildValidEligibility();

    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        value
      );

    assert.equal(result.version, "DEV-268");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.authorized, true);

    assert.equal(
      result.authorizationState,
      "ACTIVE_ADMISSION_AUTHORIZED"
    );

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.activeAdmissionAuthorizationDecisionOnly,
      true
    );

    assert.equal(
      result.authorizationResultIsInertData,
      true
    );

    assert.equal(
      result.futureActiveAdmissionBoundaryRequired,
      true
    );

    assert.equal(result.eligibility, value);

    assert.ok(
      result.activeAdmissionAuthorizationEvidence.length >
      0
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "authorization is not active admission",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        buildValidEligibility()
      );

    assert.equal(
      result.mayAdmitIntoActiveExecutor,
      false
    );

    assert.equal(
      result.mayActivateAdmission,
      false
    );
  }
);

test(
  "authorization grants no execution authority",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        buildValidEligibility()
      );

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
  }
);

test(
  "authorization grants no repository authority",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        buildValidEligibility()
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
  "authorization grants no retry persistence inspection secret scope shell or external authority",
  () => {
    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        buildValidEligibility()
      );

    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );

    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);
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
    const value = buildValidEligibility();

    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        value
      );

    assert.equal(result.eligibility, value);
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
      result.provenance,
      value.provenance
    );

    assert.deepEqual(
      result.authorizationBoundaries,
      value.authorizationBoundaries
    );

    assert.deepEqual(
      result.scopeBoundaries,
      value.scopeBoundaries
    );

    assert.deepEqual(
      result.activeAdmissionEligibilityEvidence,
      value.activeAdmissionEligibilityEvidence
    );
  }
);

test(
  "unauthorized result releases no predecessor payload",
  () => {
    const value = buildValidEligibility();

    (
      value as unknown as {
        eligible: false;
      }
    ).eligible = false;

    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        value
      );

    assert.equal(result.authorized, false);

    assert.equal(
      result.authorizationState,
      "ACTIVE_ADMISSION_UNAUTHORIZED"
    );

    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);
    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);

    assert.deepEqual(result.approvedExecutionScope, []);
    assert.deepEqual(result.provenance, []);
    assert.deepEqual(result.authorizationBoundaries, []);
    assert.deepEqual(result.scopeBoundaries, []);
    assert.deepEqual(result.verificationEvidence, []);
    assert.deepEqual(result.acceptanceEvidence, []);
    assert.deepEqual(result.packagingEvidence, []);
    assert.deepEqual(
      result.packageVerificationEvidence,
      []
    );
    assert.deepEqual(result.admissionEvidence, []);
    assert.deepEqual(result.consumptionEvidence, []);
    assert.deepEqual(
      result.activeAdmissionEligibilityEvidence,
      []
    );
    assert.deepEqual(
      result.activeAdmissionAuthorizationEvidence,
      []
    );

    assert.ok(result.blockedReasons.length > 0);
  }
);

const invalidCases: Array<{
  readonly name: string;
  readonly mutate: (
    value: RiverDevControlledExecutorActiveAdmissionEligibilityFoundationResult
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
    name: "rejects ineligible predecessor",
    mutate: value => {
      (
        value as unknown as {
          eligible: false;
        }
      ).eligible = false;
    },
    reason: "PREDECESSOR_NOT_ELIGIBLE"
  },
  {
    name: "rejects wrong eligibility state",
    mutate: value => {
      (
        value as unknown as {
          eligibilityState:
            "ACTIVE_ADMISSION_INELIGIBLE";
        }
      ).eligibilityState =
        "ACTIVE_ADMISSION_INELIGIBLE";
    },
    reason:
      "PREDECESSOR_NOT_ACTIVE_ADMISSION_ELIGIBLE"
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
          approvedExecutionScope: string[];
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
          provenance: string[];
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
          authorizationBoundaries: string[];
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
          scopeBoundaries: string[];
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
          verificationEvidence: string[];
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
          acceptanceEvidence: string[];
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
          packagingEvidence: string[];
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
          packageVerificationEvidence: string[];
        }
      ).packageVerificationEvidence = [];
    },
    reason: "MISSING_PACKAGE_VERIFICATION_EVIDENCE"
  },
  {
    name: "rejects empty admission evidence",
    mutate: value => {
      (
        value as unknown as {
          admissionEvidence: string[];
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
          consumptionEvidence: string[];
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
          activeAdmissionEligibilityEvidence: string[];
        }
      ).activeAdmissionEligibilityEvidence = [];
    },
    reason:
      "MISSING_ACTIVE_ADMISSION_ELIGIBILITY_EVIDENCE"
  },
  {
    name: "rejects predecessor blocked reasons",
    mutate: value => {
      (
        value as unknown as {
          blockedReasons: string[];
        }
      ).blockedReasons = ["blocked"];
    },
    reason: "PREDECESSOR_HAS_BLOCKED_REASONS"
  },
  {
    name: "rejects predecessor authority boundary violation",
    mutate: value => {
      (
        value as unknown as {
          mayActivateAdmission: true;
        }
      ).mayActivateAdmission = true;
    },
    reason: "PREDECESSOR_AUTHORITY_BOUNDARY_VIOLATION"
  },
  {
    name: "rejects missing future active admission boundary",
    mutate: value => {
      (
        value as unknown as {
          futureActiveAdmissionBoundaryRequired: false;
        }
      ).futureActiveAdmissionBoundaryRequired = false;
    },
    reason:
      "FUTURE_ACTIVE_ADMISSION_BOUNDARY_NOT_REQUIRED"
  }
];

for (const invalidCase of invalidCases) {
  test(invalidCase.name, () => {
    const value = buildValidEligibility();

    invalidCase.mutate(value);

    const result =
      buildControlledExecutorActiveAdmissionAuthorizationFoundation(
        value
      );

    assert.equal(result.authorized, false);

    assert.equal(
      result.authorizationState,
      "ACTIVE_ADMISSION_UNAUTHORIZED"
    );

    assert.ok(
      result.blockedReasons.includes(
        invalidCase.reason
      )
    );

    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);

    assert.deepEqual(
      result.activeAdmissionAuthorizationEvidence,
      []
    );
  });
}

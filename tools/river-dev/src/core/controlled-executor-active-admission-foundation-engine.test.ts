import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult,
} from "../types";

import {
  establishControlledExecutorActiveAdmissionFoundation,
} from "./controlled-executor-active-admission-foundation-engine";

function validAuthorization():
  RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult {
  return {
    version: "DEV-268",
    trusted: true,
    ready: true,
    authorized: true,
    defaultPolicy: "DENY",
    activeAdmissionAuthorizationDecisionOnly: true,
    authorizationResultIsInertData: true,
    authorizationState: "ACTIVE_ADMISSION_AUTHORIZED",
    eligibility: {} as never,
    consumption: {} as never,
    receiptState: "EXECUTION_SUCCEEDED",
    executedOperation: "inspect-approved-repository-state",
    approvedExecutionScope: ["repository:approved-state"],
    provenance: ["DEV-268:test-provenance"],
    authorizationBoundaries: ["approved-scope-only"],
    scopeBoundaries: ["no-scope-expansion"],
    verificationEvidence: ["verification"],
    acceptanceEvidence: ["acceptance"],
    packagingEvidence: ["packaging"],
    packageVerificationEvidence: ["package-verification"],
    admissionEvidence: ["admission"],
    consumptionEvidence: ["consumption"],
    activeAdmissionEligibilityEvidence: ["eligibility"],
    activeAdmissionAuthorizationEvidence: ["authorization"],
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
    futureActiveAdmissionBoundaryRequired: true,
  };
}

test("accepts exact authorized DEV-268 predecessor", () => {
  const authorization = validAuthorization();

  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      authorization,
    );

  assert.equal(result.version, "DEV-269");
  assert.equal(result.trusted, true);
  assert.equal(result.ready, true);
  assert.equal(result.admitted, true);
  assert.equal(result.defaultPolicy, "DENY");
  assert.equal(result.controlledActiveAdmissionOnly, true);
  assert.equal(
    result.admissionState,
    "ACTIVE_ADMISSION_ACCEPTED",
  );
  assert.equal(result.authorization, authorization);
  assert.equal(result.blockedReasons.length, 0);
  assert.equal(
    result.futureDispatchAuthorizationBoundaryRequired,
    true,
  );
});

test("preserves authorized predecessor payload", () => {
  const authorization = validAuthorization();

  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      authorization,
    );

  assert.equal(result.eligibility, authorization.eligibility);
  assert.equal(result.consumption, authorization.consumption);
  assert.equal(result.receiptState, authorization.receiptState);
  assert.equal(
    result.executedOperation,
    "inspect-approved-repository-state",
  );
  assert.deepEqual(
    result.approvedExecutionScope,
    authorization.approvedExecutionScope,
  );
  assert.deepEqual(result.provenance, authorization.provenance);
  assert.deepEqual(
    result.activeAdmissionAuthorizationEvidence,
    authorization.activeAdmissionAuthorizationEvidence,
  );
});

test("active admission grants no dispatch invocation or execution authority", () => {
  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      validAuthorization(),
    );

  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
  assert.equal(result.mayInvokeInspectionDependency, false);
});

test("active admission grants no repository authority", () => {
  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      validAuthorization(),
    );

  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayDeleteRepositoryContent, false);
  assert.equal(result.mayStageRepositoryChanges, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);
});

test("active admission grants no scope secret shell or external authority", () => {
  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      validAuthorization(),
    );

  assert.equal(result.mayAccessSecrets, false);
  assert.equal(result.mayExpandScope, false);
  assert.equal(result.mayPerformArbitraryShellExecution, false);
  assert.equal(result.mayPerformExternalSideEffects, false);
});

test("active admission does not create downstream execution authorization", () => {
  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      validAuthorization(),
    );

  assert.equal(result.mayCreateExecutionAuthorization, false);
  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayAdmitIntoActiveExecutor, false);
  assert.equal(result.mayActivateAdmission, false);
});

test("constructs controlled active-admission evidence", () => {
  const result =
    establishControlledExecutorActiveAdmissionFoundation(
      validAuthorization(),
    );

  assert.ok(result.controlledActiveAdmissionEvidence.length > 0);
  assert.ok(
    result.controlledActiveAdmissionEvidence.includes(
      "DEV-269:CONTROLLED_ACTIVE_ADMISSION_ACCEPTED",
    ),
  );
  assert.ok(
    result.controlledActiveAdmissionEvidence.includes(
      "DEV-269:DISPATCH_AUTHORITY_NOT_GRANTED",
    ),
  );
});

const invalidCases: ReadonlyArray<{
  readonly name: string;
  readonly mutate: (
    value:
      RiverDevControlledExecutorActiveAdmissionAuthorizationFoundationResult,
  ) => void;
}> = [
  {
    name: "rejects untrusted predecessor",
    mutate: value => {
      (value as unknown as { trusted: boolean }).trusted = false;
    },
  },
  {
    name: "rejects predecessor that is not ready",
    mutate: value => {
      (value as unknown as { ready: boolean }).ready = false;
    },
  },
  {
    name: "rejects unauthorized predecessor",
    mutate: value => {
      (value as unknown as { authorized: boolean }).authorized = false;
    },
  },
  {
    name: "rejects unauthorized state",
    mutate: value => {
      (
        value as unknown as {
          authorizationState: string;
        }
      ).authorizationState = "ACTIVE_ADMISSION_UNAUTHORIZED";
    },
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
  },
  {
    name: "rejects empty package verification evidence",
    mutate: value => {
      (
        value as unknown as {
          packageVerificationEvidence: readonly string[];
        }
      ).packageVerificationEvidence = [];
    },
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
  },
  {
    name: "rejects empty eligibility evidence",
    mutate: value => {
      (
        value as unknown as {
          activeAdmissionEligibilityEvidence: readonly string[];
        }
      ).activeAdmissionEligibilityEvidence = [];
    },
  },
  {
    name: "rejects empty authorization evidence",
    mutate: value => {
      (
        value as unknown as {
          activeAdmissionAuthorizationEvidence: readonly string[];
        }
      ).activeAdmissionAuthorizationEvidence = [];
    },
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
  },
  {
    name: "rejects predecessor authority escalation",
    mutate: value => {
      (
        value as unknown as {
          mayDispatch: boolean;
        }
      ).mayDispatch = true;
    },
  },
];

for (const invalidCase of invalidCases) {
  test(invalidCase.name, () => {
    const authorization = validAuthorization();

    invalidCase.mutate(authorization);

    const result =
      establishControlledExecutorActiveAdmissionFoundation(
        authorization,
      );

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.admitted, false);
    assert.equal(
      result.admissionState,
      "ACTIVE_ADMISSION_REJECTED",
    );
    assert.equal(result.authorization, null);
    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);
    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);
    assert.deepEqual(result.approvedExecutionScope, []);
    assert.deepEqual(result.provenance, []);
    assert.deepEqual(result.controlledActiveAdmissionEvidence, []);
    assert.ok(result.blockedReasons.length > 0);
    assert.equal(result.mayDispatch, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(
      result.futureDispatchAuthorizationBoundaryRequired,
      true,
    );
  });
}

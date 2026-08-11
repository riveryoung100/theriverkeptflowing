import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
} from "../types";

import {
  evaluateControlledExecutorActiveAdmissionEligibility
} from "./controlled-executor-active-admission-eligibility-foundation-engine";

function validConsumption():
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult {
  return {
    version: "DEV-266",
    source: {} as RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult["source"],
    objective: {} as RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult["objective"],
    trusted: true,
    ready: true,
    consumable: true,
    defaultPolicy: "DENY",
    admissionConsumptionDecisionOnly: true,
    consumptionResultIsInertData: true,
    consumptionState: "ADMISSION_CONSUMPTION_ACCEPTED",
    admission: {} as RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult["admission"],
    receiptState: "EXECUTION_SUCCEEDED",
    executedOperation: "inspect-approved-repository-state",
    approvedExecutionScope: ["repository:read"],
    provenance: ["DEV-266"],
    authorizationBoundaries: ["deny-active-admission"],
    scopeBoundaries: ["approved-scope-only"],
    verificationEvidence: ["verified"],
    acceptanceEvidence: ["accepted"],
    packagingEvidence: ["packaged"],
    packageVerificationEvidence: ["package-verified"],
    admissionEvidence: ["admitted-for-consumption"],
    consumptionEvidence: ["consumed-inertly"],
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

test("valid DEV-266 result becomes active-admission eligible", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.version, "DEV-267");
  assert.equal(result.eligible, true);
  assert.equal(
    result.eligibilityState,
    "ACTIVE_ADMISSION_ELIGIBLE"
  );
});

test("eligible result remains inert data", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.defaultPolicy, "DENY");
  assert.equal(
    result.activeAdmissionEligibilityDecisionOnly,
    true
  );
  assert.equal(result.eligibilityResultIsInertData, true);
});

test("eligible result does not activate admission", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayActivateAdmission, false);
  assert.equal(result.mayAdmitIntoActiveExecutor, false);
});

test("eligible result grants no execution authority", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayCreateExecutionAuthorization, false);
  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
});

test("eligible result grants no repository authority", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayModifyRepository, false);
  assert.equal(result.mayDeleteRepositoryContent, false);
  assert.equal(result.mayStageRepositoryChanges, false);
  assert.equal(result.mayCommit, false);
  assert.equal(result.mayPush, false);
  assert.equal(result.mayDeploy, false);
});

test("eligible result requires future active-admission boundary", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(
    result.futureActiveAdmissionBoundaryRequired,
    true
  );
});

const invalidCases: Array<{
  name: string;
  mutate: (
    value: RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundationResult
  ) => void;
}> = [
  {
    name: "untrusted consumption is ineligible",
    mutate: value => {
      (value as { trusted: boolean }).trusted = false;
    }
  },
  {
    name: "not-ready consumption is ineligible",
    mutate: value => {
      (value as { ready: boolean }).ready = false;
    }
  },
  {
    name: "non-consumable result is ineligible",
    mutate: value => {
      (value as { consumable: boolean }).consumable = false;
    }
  },
  {
    name: "rejected consumption state is ineligible",
    mutate: value => {
      (value as { consumptionState: string }).consumptionState =
        "ADMISSION_CONSUMPTION_REJECTED";
    }
  },
  {
    name: "missing admission lineage is ineligible",
    mutate: value => {
      (value as unknown as { admission: null }).admission = null;
    }
  },
  {
    name: "missing receipt state is ineligible",
    mutate: value => {
      (value as { receiptState: null }).receiptState = null;
    }
  },
  {
    name: "missing executed operation is ineligible",
    mutate: value => {
      (value as { executedOperation: null }).executedOperation =
        null;
    }
  },
  {
    name: "empty approved scope is ineligible",
    mutate: value => {
      (value as unknown as { approvedExecutionScope: string[] })
        .approvedExecutionScope = [];
    }
  },
  {
    name: "empty provenance is ineligible",
    mutate: value => {
      (value as unknown as { provenance: string[] }).provenance = [];
    }
  },
  {
    name: "empty authorization boundaries are ineligible",
    mutate: value => {
      (value as unknown as { authorizationBoundaries: string[] })
        .authorizationBoundaries = [];
    }
  },
  {
    name: "empty scope boundaries are ineligible",
    mutate: value => {
      (value as unknown as { scopeBoundaries: string[] }).scopeBoundaries =
        [];
    }
  },
  {
    name: "empty verification evidence is ineligible",
    mutate: value => {
      (value as unknown as { verificationEvidence: string[] })
        .verificationEvidence = [];
    }
  },
  {
    name: "empty acceptance evidence is ineligible",
    mutate: value => {
      (value as unknown as { acceptanceEvidence: string[] })
        .acceptanceEvidence = [];
    }
  },
  {
    name: "empty packaging evidence is ineligible",
    mutate: value => {
      (value as unknown as { packagingEvidence: string[] })
        .packagingEvidence = [];
    }
  },
  {
    name: "empty package verification evidence is ineligible",
    mutate: value => {
      (value as unknown as { packageVerificationEvidence: string[] })
        .packageVerificationEvidence = [];
    }
  },
  {
    name: "empty admission evidence is ineligible",
    mutate: value => {
      (value as unknown as { admissionEvidence: string[] })
        .admissionEvidence = [];
    }
  },
  {
    name: "empty consumption evidence is ineligible",
    mutate: value => {
      (value as unknown as { consumptionEvidence: string[] })
        .consumptionEvidence = [];
    }
  },
  {
    name: "predecessor blocked reasons are ineligible",
    mutate: value => {
      (value as unknown as { blockedReasons: string[] }).blockedReasons = [
        "blocked"
      ];
    }
  },
  {
    name: "missing future boundary is ineligible",
    mutate: value => {
      (
        value as {
          futureActiveAdmissionBoundaryRequired: boolean;
        }
      ).futureActiveAdmissionBoundaryRequired = false;
    }
  }
];

for (const invalidCase of invalidCases) {
  test(invalidCase.name, () => {
    const value = validConsumption();

    invalidCase.mutate(value);

    const result =
      evaluateControlledExecutorActiveAdmissionEligibility(value);

    assert.equal(result.eligible, false);
    assert.equal(
      result.eligibilityState,
      "ACTIVE_ADMISSION_INELIGIBLE"
    );
  });
}

test("ineligible result releases no predecessor payload", () => {
  const value = validConsumption();

  (value as { trusted: boolean }).trusted = false;

  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(value);

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
  assert.deepEqual(result.packageVerificationEvidence, []);
  assert.deepEqual(result.admissionEvidence, []);
  assert.deepEqual(result.consumptionEvidence, []);
  assert.deepEqual(result.activeAdmissionEligibilityEvidence, []);
});

test("eligible result preserves predecessor lineage", () => {
  const value = validConsumption();

  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(value);

  assert.equal(result.consumption, value);
  assert.equal(
    result.executedOperation,
    "inspect-approved-repository-state"
  );
  assert.deepEqual(
    result.approvedExecutionScope,
    value.approvedExecutionScope
  );
});

test("eligible result creates active-admission eligibility evidence", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.ok(result.activeAdmissionEligibilityEvidence.length > 0);
});

test("eligibility evidence grants no downstream authority", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayAuthorizeDownstreamAction, false);
  assert.equal(result.mayActivateAdmission, false);
  assert.equal(result.mayDispatch, false);
  assert.equal(result.mayInvokeExecutor, false);
  assert.equal(result.mayExecuteOperation, false);
});

test("eligibility engine performs no inspection dependency invocation", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayInvokeInspectionDependency, false);
});

test("eligibility engine grants no retry or persistence authority", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayRetryExecution, false);
  assert.equal(result.mayPersistLifecycleState, false);
});

test("eligibility engine grants no secret or scope authority", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(result.mayAccessSecrets, false);
  assert.equal(result.mayExpandScope, false);
});

test("eligibility engine grants no shell or external side effects", () => {
  const result =
    evaluateControlledExecutorActiveAdmissionEligibility(
      validConsumption()
    );

  assert.equal(
    result.mayPerformArbitraryShellExecution,
    false
  );
  assert.equal(result.mayPerformExternalSideEffects, false);
});

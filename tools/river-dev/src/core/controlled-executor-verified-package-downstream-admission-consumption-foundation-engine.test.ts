import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundation
} from "./controlled-executor-verified-package-downstream-admission-consumption-foundation-engine";

import type {
  RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult
} from "../types";

function validAdmission():
RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult {
  return {
    version:
      "DEV-265",

    source:
      "controlled-executor-verified-package-downstream-admission-foundation-engine",

    objective:
      "Determine whether a verified inert DEV-264 package-verification result is eligible for admission to a future downstream boundary without granting downstream action or execution authority.",

    trusted:
      true,

    ready:
      true,

    admissionEligible:
      true,

    defaultPolicy:
      "DENY",

    downstreamAdmissionEligibilityOnly:
      true,

    admissionResultIsInertData:
      true,

    admissionState:
      "VERIFIED_PACKAGE_ADMISSION_ELIGIBLE",

    verification:
      {} as RiverDevControlledExecutorVerifiedPackageDownstreamAdmissionFoundationResult[
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

    packagingEvidence: [
      "packaging-evidence"
    ],

    packageVerificationEvidence: [
      "package-verification-evidence"
    ],

    admissionEvidence: [
      "admission-evidence"
    ],

    blockedReasons:
      [],

    mayCreateExecutionAuthorization:
      false,

    mayAuthorizeDownstreamAction:
      false,

    mayAdmitIntoActiveExecutor:
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

    futureDownstreamAdmissionConsumptionBoundaryRequired:
      true
  };
}

function evaluate(
  admission =
    validAdmission()
) {
  return evaluateControlledExecutorVerifiedPackageDownstreamAdmissionConsumptionFoundation({
    admission
  });
}

test(
  "consumes valid DEV-265 admission eligibility as inert data",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.consumable, true);

    assert.equal(
      result.consumptionState,
      "ADMISSION_CONSUMPTION_ACCEPTED"
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "preserves deny-by-default admission-consumption-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.admissionConsumptionDecisionOnly, true);
    assert.equal(result.consumptionResultIsInertData, true);
  }
);

test("preserves receipt state", () => {
  assert.equal(
    evaluate().receiptState,
    "EXECUTION_SUCCEEDED"
  );
});

test("preserves executed operation", () => {
  assert.equal(
    evaluate().executedOperation,
    "inspect-approved-repository-state"
  );
});

test("preserves approved execution scope", () => {
  assert.deepEqual(
    evaluate().approvedExecutionScope,
    ["approved-scope"]
  );
});

test("preserves provenance", () => {
  assert.deepEqual(
    evaluate().provenance,
    ["verified-provenance"]
  );
});

test("preserves authorization boundaries", () => {
  assert.deepEqual(
    evaluate().authorizationBoundaries,
    ["verified-authorization-boundary"]
  );
});

test("preserves scope boundaries", () => {
  assert.deepEqual(
    evaluate().scopeBoundaries,
    ["verified-scope-boundary"]
  );
});

test("preserves verification evidence", () => {
  assert.deepEqual(
    evaluate().verificationEvidence,
    ["verification-evidence"]
  );
});

test("preserves acceptance evidence", () => {
  assert.deepEqual(
    evaluate().acceptanceEvidence,
    ["acceptance-evidence"]
  );
});

test("preserves packaging evidence", () => {
  assert.deepEqual(
    evaluate().packagingEvidence,
    ["packaging-evidence"]
  );
});

test("preserves package verification evidence", () => {
  assert.deepEqual(
    evaluate().packageVerificationEvidence,
    ["package-verification-evidence"]
  );
});

test("preserves admission evidence", () => {
  assert.deepEqual(
    evaluate().admissionEvidence,
    ["admission-evidence"]
  );
});

test("produces consumption evidence", () => {
  assert.ok(
    evaluate().consumptionEvidence.length > 0
  );
});

test("rejects wrong DEV-265 version", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      version: string;
    }
  ).version =
    "DEV-264";

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects untrusted DEV-265 result", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      trusted: boolean;
    }
  ).trusted =
    false;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects non-ready DEV-265 result", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      ready: boolean;
    }
  ).ready =
    false;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects non-eligible DEV-265 result", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      admissionEligible: boolean;
    }
  ).admissionEligible =
    false;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects non-DENY DEV-265 policy", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      defaultPolicy: string;
    }
  ).defaultPolicy =
    "ALLOW";

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test(
  "rejects DEV-265 result that is not admission-eligibility-only",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        downstreamAdmissionEligibilityOnly: boolean;
      }
    ).downstreamAdmissionEligibilityOnly =
      false;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test(
  "rejects DEV-265 admission result that is not inert",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        admissionResultIsInertData: boolean;
      }
    ).admissionResultIsInertData =
      false;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test("rejects non-eligible admission state", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      admissionState: string;
    }
  ).admissionState =
    "VERIFIED_PACKAGE_ADMISSION_REJECTED";

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing preserved verification", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      verification: unknown;
    }
  ).verification =
    null;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("accepts EXECUTION_FAILED receipt state", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      receiptState: string;
    }
  ).receiptState =
    "EXECUTION_FAILED";

  assert.equal(
    evaluate(admission).consumable,
    true
  );
});

test(
  "accepts EXECUTION_NOT_ATTEMPTED receipt state",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        receiptState: string;
      }
    ).receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    assert.equal(
      evaluate(admission).consumable,
      true
    );
  }
);

test("rejects unrecognized receipt state", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      receiptState: string;
    }
  ).receiptState =
    "UNKNOWN";

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing executed operation", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      executedOperation: string | null;
    }
  ).executedOperation =
    null;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing approved execution scope", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      approvedExecutionScope: string[];
    }
  ).approvedExecutionScope =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing provenance", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      provenance: string[];
    }
  ).provenance =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing authorization boundaries", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      authorizationBoundaries: string[];
    }
  ).authorizationBoundaries =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing scope boundaries", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      scopeBoundaries: string[];
    }
  ).scopeBoundaries =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing verification evidence", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      verificationEvidence: string[];
    }
  ).verificationEvidence =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing acceptance evidence", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      acceptanceEvidence: string[];
    }
  ).acceptanceEvidence =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects missing packaging evidence", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      packagingEvidence: string[];
    }
  ).packagingEvidence =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test(
  "rejects missing package verification evidence",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        packageVerificationEvidence: string[];
      }
    ).packageVerificationEvidence =
      [];

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test("rejects missing admission evidence", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      admissionEvidence: string[];
    }
  ).admissionEvidence =
    [];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects non-empty DEV-265 blocked reasons", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      blockedReasons: string[];
    }
  ).blockedReasons =
    ["blocked"];

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test(
  "rejects granted execution authorization authority",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        mayCreateExecutionAuthorization: boolean;
      }
    ).mayCreateExecutionAuthorization =
      true;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test(
  "rejects granted downstream action authority",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        mayAuthorizeDownstreamAction: boolean;
      }
    ).mayAuthorizeDownstreamAction =
      true;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test(
  "rejects granted active executor admission authority",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        mayAdmitIntoActiveExecutor: boolean;
      }
    ).mayAdmitIntoActiveExecutor =
      true;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test("rejects granted dispatch authority", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      mayDispatch: boolean;
    }
  ).mayDispatch =
    true;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test("rejects granted execution authority", () => {
  const admission =
    validAdmission();

  (
    admission as unknown as {
      mayExecuteOperation: boolean;
    }
  ).mayExecuteOperation =
    true;

  assert.equal(
    evaluate(admission).consumable,
    false
  );
});

test(
  "rejects missing future admission-consumption boundary",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        futureDownstreamAdmissionConsumptionBoundaryRequired: boolean;
      }
    ).futureDownstreamAdmissionConsumptionBoundaryRequired =
      false;

    assert.equal(
      evaluate(admission).consumable,
      false
    );
  }
);

test(
  "rejected consumption releases no preserved payload or evidence",
  () => {
    const admission =
      validAdmission();

    (
      admission as unknown as {
        trusted: boolean;
      }
    ).trusted =
      false;

    const result =
      evaluate(admission);

    assert.equal(
      result.consumptionState,
      "ADMISSION_CONSUMPTION_REJECTED"
    );

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
  }
);

test(
  "consumable result grants no active-admission or downstream authority",
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
      result.mayAdmitIntoActiveExecutor,
      false
    );

    assert.equal(
      result.mayActivateAdmission,
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
      result.futureActiveAdmissionBoundaryRequired,
      true
    );
  }
);

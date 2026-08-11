import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateControlledExecutorVerifiedPackageDownstreamAdmissionFoundation
} from "./controlled-executor-verified-package-downstream-admission-foundation-engine";

import type {
  RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult
} from "../types";

function validVerification():
RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult {
  return {
    version:
      "DEV-264",

    source:
      "controlled-executor-packaged-downstream-handoff-verification-foundation-engine",

    objective:
      "Verify an inert DEV-263 accepted downstream handoff package before any future downstream boundary may consume it, without granting downstream action or execution authority.",

    trusted:
      true,

    ready:
      true,

    verified:
      true,

    defaultPolicy:
      "DENY",

    packageVerificationOnly:
      true,

    verificationResultIsInertData:
      true,

    verificationState:
      "PACKAGED_DOWNSTREAM_HANDOFF_VERIFIED",

    package:
      {} as RiverDevControlledExecutorPackagedDownstreamHandoffVerificationFoundationResult[
        "package"
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
  return evaluateControlledExecutorVerifiedPackageDownstreamAdmissionFoundation({
    verification
  });
}

test(
  "admits valid DEV-264 verification as eligible inert data",
  () => {
    const result =
      evaluate();

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.admissionEligible, true);

    assert.equal(
      result.admissionState,
      "VERIFIED_PACKAGE_ADMISSION_ELIGIBLE"
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "preserves deny-by-default admission-eligibility-only semantics",
  () => {
    const result =
      evaluate();

    assert.equal(result.defaultPolicy, "DENY");

    assert.equal(
      result.downstreamAdmissionEligibilityOnly,
      true
    );

    assert.equal(
      result.admissionResultIsInertData,
      true
    );
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

test("produces admission evidence", () => {
  assert.ok(
    evaluate().admissionEvidence.length > 0
  );
});

test("rejects wrong DEV-264 version", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      version: string;
    }
  ).version =
    "DEV-263";

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects untrusted DEV-264 verification", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      trusted: boolean;
    }
  ).trusted =
    false;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects non-ready DEV-264 verification", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      ready: boolean;
    }
  ).ready =
    false;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects non-verified DEV-264 result", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      verified: boolean;
    }
  ).verified =
    false;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects non-DENY DEV-264 policy", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      defaultPolicy: string;
    }
  ).defaultPolicy =
    "ALLOW";

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test(
  "rejects DEV-264 result that is not package-verification-only",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        packageVerificationOnly: boolean;
      }
    ).packageVerificationOnly =
      false;

    assert.equal(
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test(
  "rejects DEV-264 verification result that is not inert",
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
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test("rejects non-verified verification state", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      verificationState: string;
    }
  ).verificationState =
    "PACKAGED_DOWNSTREAM_HANDOFF_REJECTED";

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing preserved package", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      package: unknown;
    }
  ).package =
    null;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("accepts EXECUTION_FAILED receipt state", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      receiptState: string;
    }
  ).receiptState =
    "EXECUTION_FAILED";

  assert.equal(
    evaluate(verification).admissionEligible,
    true
  );
});

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
      evaluate(verification).admissionEligible,
      true
    );
  }
);

test("rejects unrecognized receipt state", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      receiptState: string;
    }
  ).receiptState =
    "UNKNOWN";

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing executed operation", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      executedOperation: string | null;
    }
  ).executedOperation =
    null;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing approved execution scope", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      approvedExecutionScope: string[];
    }
  ).approvedExecutionScope =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing provenance", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      provenance: string[];
    }
  ).provenance =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing authorization boundaries", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      authorizationBoundaries: string[];
    }
  ).authorizationBoundaries =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing scope boundaries", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      scopeBoundaries: string[];
    }
  ).scopeBoundaries =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing verification evidence", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      verificationEvidence: string[];
    }
  ).verificationEvidence =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing acceptance evidence", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      acceptanceEvidence: string[];
    }
  ).acceptanceEvidence =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects missing packaging evidence", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      packagingEvidence: string[];
    }
  ).packagingEvidence =
    [];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test(
  "rejects missing package verification evidence",
  () => {
    const verification =
      validVerification();

    (
      verification as unknown as {
        packageVerificationEvidence: string[];
      }
    ).packageVerificationEvidence =
      [];

    assert.equal(
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test("rejects non-empty DEV-264 blocked reasons", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      blockedReasons: string[];
    }
  ).blockedReasons =
    ["blocked"];

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

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
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test(
  "rejects granted downstream action authority",
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
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test("rejects granted dispatch authority", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      mayDispatch: boolean;
    }
  ).mayDispatch =
    true;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

test("rejects granted execution authority", () => {
  const verification =
    validVerification();

  (
    verification as unknown as {
      mayExecuteOperation: boolean;
    }
  ).mayExecuteOperation =
    true;

  assert.equal(
    evaluate(verification).admissionEligible,
    false
  );
});

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
      evaluate(verification).admissionEligible,
      false
    );
  }
);

test(
  "rejected admission releases no preserved payload or evidence",
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
      result.admissionState,
      "VERIFIED_PACKAGE_ADMISSION_REJECTED"
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
  }
);

test(
  "eligible admission result grants no downstream authority",
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
      result.futureDownstreamAdmissionConsumptionBoundaryRequired,
      true
    );
  }
);

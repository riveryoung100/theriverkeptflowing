import test from "node:test";
import assert from "node:assert/strict";

import type {
  RiverDevControlledExecutorExecutionReceiptVerificationFoundation
} from "../types";

import {
  evaluateControlledExecutorVerifiedReceiptAcceptanceFoundation
} from "./controlled-executor-verified-receipt-acceptance-foundation-engine";

function validVerification():
RiverDevControlledExecutorExecutionReceiptVerificationFoundation {
  return {
    version:
      "DEV-258",

    source:
      "controlled-executor-execution-receipt-verification-foundation-engine",

    objective:
      "Verify execution receipt.",

    trusted:
      true,

    ready:
      true,

    verified:
      true,

    defaultPolicy:
      "DENY",

    verificationOnly:
      true,

    receipt: {
      version:
        "DEV-257"
    } as RiverDevControlledExecutorExecutionReceiptVerificationFoundation[
      "receipt"
    ],

    receiptState:
      "EXECUTION_SUCCEEDED",

    executedOperation:
      "inspect-approved-repository-state",

    approvedExecutionScope: [
      "C:/repo"
    ],

    provenance: [
      "DEV-257 execution receipt",
      "DEV-258 receipt verification"
    ],

    authorizationBoundaries: [
      "receipt verification only"
    ],

    scopeBoundaries: [
      "approved execution scope preserved"
    ],

    verificationState: [
      "DEV-257 receipt identity verified",
      "receipt-state consistency verified",
      "authority exclusion verified"
    ],

    blockedReasons:
      [],

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
      false
  };
}

function evaluate(
  verification =
    validVerification()
) {
  return evaluateControlledExecutorVerifiedReceiptAcceptanceFoundation({
    verification
  });
}

test(
  "accepts valid verified DEV-258 receipt",
  () => {
    const result =
      evaluate();

    assert.equal(
      result.accepted,
      true
    );

    assert.equal(
      result.trusted,
      true
    );

    assert.equal(
      result.ready,
      true
    );

    assert.equal(
      result.acceptanceState,
      "VERIFIED_RECEIPT_ACCEPTED"
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

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.acceptanceDecisionOnly,
      true
    );
  }
);

test(
  "rejects wrong DEV-258 version",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        version: string;
      };

    mutable.version =
      "DEV-999";

    const result =
      evaluate(verification);

    assert.equal(
      result.accepted,
      false
    );

    assert.match(
      result.blockedReasons.join(" "),
      /version/i
    );
  }
);

test(
  "rejects untrusted DEV-258 verification",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        trusted: boolean;
      };

    mutable.trusted =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-ready DEV-258 verification",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        ready: boolean;
      };

    mutable.ready =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-verified DEV-258 result",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        verified: boolean;
      };

    mutable.verified =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects non-DENY predecessor policy",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        defaultPolicy: string;
      };

    mutable.defaultPolicy =
      "ALLOW";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects predecessor that is not verification-only",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        verificationOnly: boolean;
      };

    mutable.verificationOnly =
      false;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects wrong embedded receipt version",
  () => {
    const verification =
      validVerification();

    const mutableReceipt =
      verification.receipt as unknown as {
        version: string;
      };

    mutableReceipt.version =
      "DEV-000";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects wrong executed operation",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        executedOperation: string;
      };

    mutable.executedOperation =
      "unauthorized-operation";

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "accepts EXECUTION_SUCCEEDED receipt state",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        receiptState: string;
      };

    mutable.receiptState =
      "EXECUTION_SUCCEEDED";

    assert.equal(
      evaluate(verification).accepted,
      true
    );
  }
);

test(
  "accepts EXECUTION_FAILED receipt state",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        receiptState: string;
      };

    mutable.receiptState =
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

    const mutable =
      verification as unknown as {
        receiptState: string;
      };

    mutable.receiptState =
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

    const mutable =
      verification as unknown as {
        receiptState: string;
      };

    mutable.receiptState =
      "UNKNOWN_STATE";

    const result =
      evaluate(verification);

    assert.equal(
      result.accepted,
      false
    );

    assert.equal(
      result.receiptState,
      null
    );
  }
);

test(
  "rejects missing approved execution scope",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        approvedExecutionScope: string[];
      };

    mutable.approvedExecutionScope =
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

    const mutable =
      verification as unknown as {
        provenance: string[];
      };

    mutable.provenance =
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

    const mutable =
      verification as unknown as {
        authorizationBoundaries: string[];
      };

    mutable.authorizationBoundaries =
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

    const mutable =
      verification as unknown as {
        scopeBoundaries: string[];
      };

    mutable.scopeBoundaries =
      [];

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

    const mutable =
      verification as unknown as {
        mayExecuteOperation: boolean;
      };

    mutable.mayExecuteOperation =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted repository modification authority",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        mayModifyRepository: boolean;
      };

    mutable.mayModifyRepository =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted scope expansion authority",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        mayExpandScope: boolean;
      };

    mutable.mayExpandScope =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
    );
  }
);

test(
  "rejects granted external side-effect authority",
  () => {
    const verification =
      validVerification();

    const mutable =
      verification as unknown as {
        mayPerformExternalSideEffects: boolean;
      };

    mutable.mayPerformExternalSideEffects =
      true;

    assert.equal(
      evaluate(verification).accepted,
      false
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
      result.mayDispatch,
      false
    );

    assert.equal(
      result.mayExecuteOperation,
      false
    );

    assert.equal(
      result.mayInvokeInspectionDependency,
      false
    );

    assert.equal(
      result.mayRetryExecution,
      false
    );

    assert.equal(
      result.mayPersistLifecycleState,
      false
    );

    assert.equal(
      result.mayModifyRepository,
      false
    );

    assert.equal(
      result.mayDeleteRepositoryContent,
      false
    );

    assert.equal(
      result.mayStageRepositoryChanges,
      false
    );

    assert.equal(
      result.mayCommit,
      false
    );

    assert.equal(
      result.mayPush,
      false
    );

    assert.equal(
      result.mayDeploy,
      false
    );

    assert.equal(
      result.mayAccessSecrets,
      false
    );

    assert.equal(
      result.mayExpandScope,
      false
    );

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

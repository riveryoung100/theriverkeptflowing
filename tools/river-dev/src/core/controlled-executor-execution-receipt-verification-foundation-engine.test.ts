import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyControlledExecutorExecutionReceipt
} from "./controlled-executor-execution-receipt-verification-foundation-engine";

import type {
  RiverDevControlledExecutorExecutionReceiptVerificationFoundationInput
} from "../types";

function buildInput():
RiverDevControlledExecutorExecutionReceiptVerificationFoundationInput {
  return {
    receipt: {
      version:
        "DEV-257",

      source:
        "DEV-257 test source",

      objective:
        "DEV-257 test objective",

      trusted:
        true,

      ready:
        true,

      defaultPolicy:
        "DENY",

      receiptConstructionOnly:
        true,

      executedOperation:
        "inspect-approved-repository-state",

      executionAttempted:
        true,

      executionSucceeded:
        true,

      receiptState:
        "EXECUTION_SUCCEEDED",

      executionResult:
        {} as RiverDevControlledExecutorExecutionReceiptVerificationFoundationInput[
          "receipt"
        ]["executionResult"],

      inspectionResult: {
        project:
          "The River Kept Flowing",

        repository: {
          repositoryRoot:
            "C:/repo",

          branch:
            "test",

          commit:
            "abc1234",

          clean:
            true,

          changedPaths:
            [],

          capturedAt:
            "2026-08-11T12:00:00.000Z"
        },

        policy: {
          autonomousPushAllowed:
            false,

          outsideRepositoryAllowed:
            false,

          maximumRepairAttempts:
            3,

          requiredQualityGates: [
            "typecheck"
          ]
        },

        paths: {
          source:
            "src"
        }
      },

      approvedExecutionScope: [
        "C:/repo"
      ],

      executionState: [
        "inspection execution succeeded"
      ],

      provenance: [
        "DEV-257 provenance"
      ],

      authorizationBoundaries: [
        "receipt construction only"
      ],

      scopeBoundaries: [
        "approved scope preserved"
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
    }
  };
}

test(
  "verifies valid successful receipt",
  () => {
    const result =
      verifyControlledExecutorExecutionReceipt(
        buildInput()
      );

    assert.equal(
      result.version,
      "DEV-258"
    );

    assert.equal(
      result.verified,
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

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "verifies valid failed execution receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        executionSucceeded: boolean;
        receiptState: string;
        inspectionResult: null;
      };

    mutable.executionSucceeded =
      false;

    mutable.receiptState =
      "EXECUTION_FAILED";

    mutable.inspectionResult =
      null;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      true
    );
  }
);

test(
  "verifies valid non-attempted receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        executionAttempted: boolean;
        executionSucceeded: boolean;
        receiptState: string;
        inspectionResult: null;
      };

    mutable.executionAttempted =
      false;

    mutable.executionSucceeded =
      false;

    mutable.receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    mutable.inspectionResult =
      null;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      true
    );
  }
);

test(
  "fails closed for incorrect receipt version",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        version: string;
      };

    mutable.version =
      "DEV-256";

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed for untrusted receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        trusted: boolean;
      };

    mutable.trusted =
      false;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed for non-ready receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        ready: boolean;
      };

    mutable.ready =
      false;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed for wrong operation",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        executedOperation: string;
      };

    mutable.executedOperation =
      "prepare-approved-repository-change";

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when successful receipt says execution was not attempted",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        executionAttempted: boolean;
      };

    mutable.executionAttempted =
      false;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when successful receipt says execution failed",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        executionSucceeded: boolean;
      };

    mutable.executionSucceeded =
      false;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when successful receipt has no inspection result",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        inspectionResult: null;
      };

    mutable.inspectionResult =
      null;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when failed receipt claims success",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        receiptState: string;
        executionSucceeded: boolean;
        inspectionResult: null;
      };

    mutable.receiptState =
      "EXECUTION_FAILED";

    mutable.executionSucceeded =
      true;

    mutable.inspectionResult =
      null;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when failed receipt contains inspection result",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        receiptState: string;
        executionSucceeded: boolean;
      };

    mutable.receiptState =
      "EXECUTION_FAILED";

    mutable.executionSucceeded =
      false;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed when non-attempted receipt claims attempt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        receiptState: string;
        executionSucceeded: boolean;
        inspectionResult: null;
      };

    mutable.receiptState =
      "EXECUTION_NOT_ATTEMPTED";

    mutable.executionSucceeded =
      false;

    mutable.inspectionResult =
      null;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed for unrecognized receipt state",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        receiptState: string;
      };

    mutable.receiptState =
      "UNKNOWN";

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed without approved execution scope",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        approvedExecutionScope: string[];
      };

    mutable.approvedExecutionScope =
      [];

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed without provenance",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        provenance: string[];
      };

    mutable.provenance =
      [];

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed without authorization boundaries",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        authorizationBoundaries: string[];
      };

    mutable.authorizationBoundaries =
      [];

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed without scope boundaries",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        scopeBoundaries: string[];
      };

    mutable.scopeBoundaries =
      [];

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed if receipt grants execution authority",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        mayExecuteOperation: boolean;
      };

    mutable.mayExecuteOperation =
      true;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed if receipt grants repository mutation",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        mayModifyRepository: boolean;
      };

    mutable.mayModifyRepository =
      true;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "fails closed if receipt grants push authority",
  () => {
    const input =
      buildInput();

    const mutable =
      input.receipt as unknown as {
        mayPush: boolean;
      };

    mutable.mayPush =
      true;

    const result =
      verifyControlledExecutorExecutionReceipt(
        input
      );

    assert.equal(
      result.verified,
      false
    );
  }
);

test(
  "verification grants no execution or mutation authority",
  () => {
    const result =
      verifyControlledExecutorExecutionReceipt(
        buildInput()
      );

    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayInvokeInspectionDependency, false);
    assert.equal(result.mayRetryExecution, false);
    assert.equal(result.mayPersistLifecycleState, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayDeleteRepositoryContent, false);
    assert.equal(result.mayStageRepositoryChanges, false);
    assert.equal(result.mayCommit, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.mayDeploy, false);
    assert.equal(result.mayAccessSecrets, false);
    assert.equal(result.mayExpandScope, false);
    assert.equal(result.mayPerformArbitraryShellExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
  }
);

test(
  "preserves scope and predecessor evidence without mutation",
  () => {
    const input =
      buildInput();

    const scope = [
      ...input.receipt.approvedExecutionScope
    ];

    const provenance = [
      ...input.receipt.provenance
    ];

    const authorizationBoundaries = [
      ...input.receipt.authorizationBoundaries
    ];

    const scopeBoundaries = [
      ...input.receipt.scopeBoundaries
    ];

    verifyControlledExecutorExecutionReceipt(
      input
    );

    assert.deepEqual(
      input.receipt.approvedExecutionScope,
      scope
    );

    assert.deepEqual(
      input.receipt.provenance,
      provenance
    );

    assert.deepEqual(
      input.receipt.authorizationBoundaries,
      authorizationBoundaries
    );

    assert.deepEqual(
      input.receipt.scopeBoundaries,
      scopeBoundaries
    );
  }
);

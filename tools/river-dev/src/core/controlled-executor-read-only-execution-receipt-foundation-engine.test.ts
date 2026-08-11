import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorReadOnlyExecutionReceipt
} from "./controlled-executor-read-only-execution-receipt-foundation-engine";

import type {
  RiverDevControlledExecutorReadOnlyExecutionReceiptFoundationInput
} from "../types";

function buildInput():
RiverDevControlledExecutorReadOnlyExecutionReceiptFoundationInput {
  return {
    executionResult: {
      version: "DEV-256",
      source:
        "DEV-256 test source",
      objective:
        "DEV-256 test objective",

      trusted: true,
      ready: true,

      executionAttempted: true,
      executionSucceeded: true,

      defaultPolicy: "DENY",
      readOnlyExecutionOnly: true,

      executedOperation:
        "inspect-approved-repository-state",

      dispatchBoundary:
        {} as RiverDevControlledExecutorReadOnlyExecutionReceiptFoundationInput[
          "executionResult"
        ]["dispatchBoundary"],

      inspectionResult: {
        project: "The River Kept Flowing",

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
        "DEV-256 provenance"
      ],

      authorizationBoundaries: [
        "read-only execution only"
      ],

      scopeBoundaries: [
        "approved scope preserved"
      ],

      blockedReasons: [],

      mayExecuteInspectApprovedRepositoryState:
        true,

      mayExecutePrepareApprovedRepositoryChange:
        false,

      mayExecuteValidateApprovedRepositoryChange:
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

      mayPerformUnrelatedExternalSideEffects:
        false,

      mayExecuteAutonomouslyOutsideApprovedBoundary:
        false
    }
  };
}

test(
  "constructs EXECUTION_SUCCEEDED receipt",
  () => {
    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        buildInput()
      );

    assert.equal(
      result.version,
      "DEV-257"
    );

    assert.equal(
      result.receiptState,
      "EXECUTION_SUCCEEDED"
    );

    assert.equal(
      result.trusted,
      true
    );

    assert.equal(
      result.ready,
      true
    );
  }
);

test(
  "constructs EXECUTION_FAILED receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        executionSucceeded: boolean;
        inspectionResult: null;
        blockedReasons: string[];
      };

    mutable.executionSucceeded =
      false;

    mutable.inspectionResult =
      null;

    mutable.blockedReasons = [
      ...input.executionResult.blockedReasons,
      "inspection failed"
    ];

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.receiptState,
      "EXECUTION_FAILED"
    );
  }
);

test(
  "constructs EXECUTION_NOT_ATTEMPTED receipt",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        executionAttempted: boolean;
        executionSucceeded: boolean;
        inspectionResult: null;
      };

    mutable.executionAttempted =
      false;

    mutable.executionSucceeded =
      false;

    mutable.inspectionResult =
      null;

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.receiptState,
      "EXECUTION_NOT_ATTEMPTED"
    );
  }
);

test(
  "preserves inspection result exactly",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.inspectionResult,
      input.executionResult.inspectionResult
    );
  }
);

test(
  "preserves approved execution scope",
  () => {
    const input =
      buildInput();

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.deepEqual(
      result.approvedExecutionScope,
      input.executionResult.approvedExecutionScope
    );
  }
);

test(
  "preserves predecessor provenance and boundaries",
  () => {
    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        buildInput()
      );

    assert.ok(
      result.provenance.includes(
        "DEV-256 provenance"
      )
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "read-only execution only"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "approved scope preserved"
      )
    );
  }
);

test(
  "fails closed for incorrect predecessor version",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        version: string;
      };

    mutable.version =
      "DEV-255";

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
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
      input.executionResult as unknown as {
        executedOperation: string;
      };

    mutable.executedOperation =
      "prepare-approved-repository-change";

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
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
      input.executionResult as unknown as {
        approvedExecutionScope: string[];
      };

    mutable.approvedExecutionScope =
      [];

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
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
      input.executionResult as unknown as {
        provenance: string[];
      };

    mutable.provenance =
      [];

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
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
      input.executionResult as unknown as {
        authorizationBoundaries: string[];
      };

    mutable.authorizationBoundaries =
      [];

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
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
      input.executionResult as unknown as {
        scopeBoundaries: string[];
      };

    mutable.scopeBoundaries =
      [];

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants lifecycle persistence",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        mayPersistLifecycleState:
          boolean;
      };

    mutable.mayPersistLifecycleState =
      true;

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants repository modification",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        mayModifyRepository:
          boolean;
      };

    mutable.mayModifyRepository =
      true;

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants commit authority",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        mayCommit:
          boolean;
      };

    mutable.mayCommit =
      true;

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants push authority",
  () => {
    const input =
      buildInput();

    const mutable =
      input.executionResult as unknown as {
        mayPush:
          boolean;
      };

    mutable.mayPush =
      true;

    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
        input
      );

    assert.equal(
      result.trusted,
      false
    );
  }
);

test(
  "receipt grants no execution or mutation authority",
  () => {
    const result =
      buildControlledExecutorReadOnlyExecutionReceipt(
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
  "does not mutate predecessor arrays",
  () => {
    const input =
      buildInput();

    const scope = [
      ...input.executionResult.approvedExecutionScope
    ];

    const provenance = [
      ...input.executionResult.provenance
    ];

    const authorizationBoundaries = [
      ...input.executionResult.authorizationBoundaries
    ];

    const scopeBoundaries = [
      ...input.executionResult.scopeBoundaries
    ];

    const blockedReasons = [
      ...input.executionResult.blockedReasons
    ];

    buildControlledExecutorReadOnlyExecutionReceipt(
      input
    );

    assert.deepEqual(
      input.executionResult.approvedExecutionScope,
      scope
    );

    assert.deepEqual(
      input.executionResult.provenance,
      provenance
    );

    assert.deepEqual(
      input.executionResult.authorizationBoundaries,
      authorizationBoundaries
    );

    assert.deepEqual(
      input.executionResult.scopeBoundaries,
      scopeBoundaries
    );

    assert.deepEqual(
      input.executionResult.blockedReasons,
      blockedReasons
    );
  }
);

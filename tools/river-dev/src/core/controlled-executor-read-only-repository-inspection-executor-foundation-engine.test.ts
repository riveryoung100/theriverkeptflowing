import assert from "node:assert/strict";
import test from "node:test";

import {
  executeControlledExecutorReadOnlyRepositoryInspection
} from "./controlled-executor-read-only-repository-inspection-executor-foundation-engine";

import type {
  RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput,
  RiverDevControlledExecutorReadOnlyInspectionResult
} from "../types";

function buildInspectionResult():
RiverDevControlledExecutorReadOnlyInspectionResult {
  return {
    project:
      "The River Kept Flowing",

    repository: {
      repositoryRoot:
        "C:/repo",

      branch:
        "dev-256-test",

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
        "typecheck",
        "tests"
      ]
    },

    paths: {
      source:
        "src"
    }
  };
}

function buildInput():
RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput {
  return {
    dispatchBoundary: {
      version:
        "DEV-255",

      source:
        "River Development Agent controlled executor dispatch boundary foundation",

      objective:
        "Inert dispatch-boundary admission.",

      trusted:
        true,

      ready:
        true,

      dispatchBoundaryAdmitted:
        true,

      defaultPolicy:
        "DENY",

      boundaryAdmissionOnly:
        true,

      dispatchAuthorization:
        {} as RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput[
          "dispatchBoundary"
        ]["dispatchAuthorization"],

      invocationRequest:
        {} as RiverDevControlledExecutorReadOnlyRepositoryInspectionExecutorFoundationInput[
          "dispatchBoundary"
        ]["invocationRequest"],

      executionRequest:
        "inspect approved repository state",

      preparedOperation:
        "inspect-approved-repository-state",

      requiredCapability:
        "inspect-approved-repository-state",

      authorizedCapabilities: [
        "inspect-approved-repository-state"
      ],

      requiredCapabilityAuthorized:
        true,

      approvedExecutionScope: [
        "C:/repo"
      ],

      dispatchBoundaryState: [
        "dispatch boundary admission granted"
      ],

      provenance: [
        "DEV-255 predecessor provenance"
      ],

      authorizationBoundaries: [
        "dispatch boundary is admission-only"
      ],

      scopeBoundaries: [
        "approved execution scope preserved"
      ],

      blockedReasons:
        [],

      dispatchBoundaryMayCreateAuthorization:
        false,

      dispatchBoundaryMayExpandScope:
        false,

      dispatchBoundaryMayInvokeExecutor:
        false,

      dispatchBoundaryMayExecuteOperation:
        false,

      dispatchBoundaryMayModifyRepository:
        false,

      dispatchBoundaryMayDeleteRepositoryContent:
        false,

      dispatchBoundaryMayCommit:
        false,

      dispatchBoundaryMayPush:
        false,

      dispatchBoundaryMayDeploy:
        false,

      dispatchBoundaryMayAccessSecrets:
        false,

      dispatchBoundaryMayPerformExternalSideEffects:
        false,

      futureExecutorRequiredForSideEffects:
        true
    },

    capturedAt:
      "2026-08-11T12:00:00.000Z",

    dependencies: {
      inspectRepository:
        async () => {
          return buildInspectionResult();
        }
    }
  };
}

test(
  "executes approved read-only inspection after valid DEV-255 admission",
  async () => {
    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        buildInput()
      );

    assert.equal(
      result.version,
      "DEV-256"
    );

    assert.equal(
      result.defaultPolicy,
      "DENY"
    );

    assert.equal(
      result.readOnlyExecutionOnly,
      true
    );

    assert.equal(
      result.executionAttempted,
      true
    );

    assert.equal(
      result.executionSucceeded,
      true
    );

    assert.equal(
      result.executedOperation,
      "inspect-approved-repository-state"
    );

    assert.ok(
      result.inspectionResult
    );

    assert.deepEqual(
      result.blockedReasons,
      []
    );
  }
);

test(
  "calls inspection dependency exactly once",
  async () => {
    const input =
      buildInput();

    let calls =
      0;

    input.dependencies.inspectRepository =
      async () => {
        calls +=
          1;

        return buildInspectionResult();
      };

    await executeControlledExecutorReadOnlyRepositoryInspection(
      input
    );

    assert.equal(
      calls,
      1
    );
  }
);

test(
  "passes deterministic capturedAt to inspection dependency",
  async () => {
    const input =
      buildInput();

    let capturedAt:
      string |
      undefined;

    input.dependencies.inspectRepository =
      async (value) => {
        capturedAt =
          value;

        return buildInspectionResult();
      };

    await executeControlledExecutorReadOnlyRepositoryInspection(
      input
    );

    assert.equal(
      capturedAt,
      "2026-08-11T12:00:00.000Z"
    );
  }
);

test(
  "preserves approved execution scope and provenance",
  async () => {
    const input =
      buildInput();

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.deepEqual(
      result.approvedExecutionScope,
      input.dispatchBoundary.approvedExecutionScope
    );

    assert.ok(
      result.provenance.includes(
        "DEV-255 predecessor provenance"
      )
    );
  }
);

test(
  "fails closed before execution when boundary is untrusted",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.trusted =
      false;

    let called =
      false;

    input.dependencies.inspectRepository =
      async () => {
        called =
          true;

        return buildInspectionResult();
      };

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.equal(
      called,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch boundary is not trusted"
      )
    );
  }
);

test(
  "fails closed before execution when boundary is not ready",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.ready =
      false;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch boundary is not ready"
      )
    );
  }
);

test(
  "fails closed before execution when boundary is not admitted",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.dispatchBoundaryAdmitted =
      false;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch boundary is not admitted"
      )
    );
  }
);

test(
  "fails closed when predecessor blockers exist",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.blockedReasons.push(
      "predecessor blocker"
    );

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "dispatch boundary contains blockers"
      )
    );
  }
);

test(
  "rejects prepare-approved-repository-change",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.preparedOperation =
      "prepare-approved-repository-change";

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "prepared operation is not the approved read-only inspection operation"
      )
    );
  }
);

test(
  "rejects validate-approved-repository-change",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.preparedOperation =
      "validate-approved-repository-change";

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "rejects mismatched required capability",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.requiredCapability =
      "prepare-approved-repository-change";

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "required capability does not match approved read-only inspection capability"
      )
    );
  }
);

test(
  "rejects unauthorized required capability",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.requiredCapabilityAuthorized =
      false;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "rejects missing authorized inspection capability",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.authorizedCapabilities =
      [];

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "rejects missing approved execution scope",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.approvedExecutionScope =
      [];

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );

    assert.ok(
      result.blockedReasons.includes(
        "approved execution scope is missing"
      )
    );
  }
);

test(
  "rejects missing authorization provenance",
  async () => {
    const input =
      buildInput();

    input.dispatchBoundary.provenance =
      [];

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants executor authority",
  async () => {
    const input =
      buildInput();

    const mutable =
      input.dispatchBoundary as unknown as {
        dispatchBoundaryMayInvokeExecutor:
          boolean;
      };

    mutable.dispatchBoundaryMayInvokeExecutor =
      true;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants repository mutation",
  async () => {
    const input =
      buildInput();

    const mutable =
      input.dispatchBoundary as unknown as {
        dispatchBoundaryMayModifyRepository:
          boolean;
      };

    mutable.dispatchBoundaryMayModifyRepository =
      true;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "fails closed if predecessor grants external side effects",
  async () => {
    const input =
      buildInput();

    const mutable =
      input.dispatchBoundary as unknown as {
        dispatchBoundaryMayPerformExternalSideEffects:
          boolean;
      };

    mutable.dispatchBoundaryMayPerformExternalSideEffects =
      true;

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      false
    );
  }
);

test(
  "fails closed when inspection dependency throws",
  async () => {
    const input =
      buildInput();

    input.dependencies.inspectRepository =
      async () => {
        throw new Error(
          "inspection failed"
        );
      };

    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        input
      );

    assert.equal(
      result.executionAttempted,
      true
    );

    assert.equal(
      result.executionSucceeded,
      false
    );

    assert.equal(
      result.inspectionResult,
      null
    );

    assert.ok(
      result.blockedReasons.includes(
        "read-only inspection execution failed: inspection failed"
      )
    );
  }
);

test(
  "grants no mutation or lifecycle-state authority",
  async () => {
    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        buildInput()
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
      result.mayPerformUnrelatedExternalSideEffects,
      false
    );
  }
);

test(
  "grants inspection execution but not prepare or validate execution",
  async () => {
    const result =
      await executeControlledExecutorReadOnlyRepositoryInspection(
        buildInput()
      );

    assert.equal(
      result.mayExecuteInspectApprovedRepositoryState,
      true
    );

    assert.equal(
      result.mayExecutePrepareApprovedRepositoryChange,
      false
    );

    assert.equal(
      result.mayExecuteValidateApprovedRepositoryChange,
      false
    );
  }
);

test(
  "does not mutate predecessor scope or provenance arrays",
  async () => {
    const input =
      buildInput();

    const scope = [
      ...input.dispatchBoundary.approvedExecutionScope
    ];

    const provenance = [
      ...input.dispatchBoundary.provenance
    ];

    const authorizationBoundaries = [
      ...input.dispatchBoundary.authorizationBoundaries
    ];

    const scopeBoundaries = [
      ...input.dispatchBoundary.scopeBoundaries
    ];

    await executeControlledExecutorReadOnlyRepositoryInspection(
      input
    );

    assert.deepEqual(
      input.dispatchBoundary.approvedExecutionScope,
      scope
    );

    assert.deepEqual(
      input.dispatchBoundary.provenance,
      provenance
    );

    assert.deepEqual(
      input.dispatchBoundary.authorizationBoundaries,
      authorizationBoundaries
    );

    assert.deepEqual(
      input.dispatchBoundary.scopeBoundaries,
      scopeBoundaries
    );
  }
);

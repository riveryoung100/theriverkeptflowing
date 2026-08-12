import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledExecutorInvocationFoundation
} from "./controlled-executor-invocation-foundation-engine";

import type {
  RiverDevControlledExecutorInvocationAuthorizationFoundationResult
} from "../types";

function validPredecessor():
  RiverDevControlledExecutorInvocationAuthorizationFoundationResult {
  return {
    version: "DEV-272",

    trusted: true,
    ready: true,
    executorInvocationAuthorized: true,

    defaultPolicy: "DENY",

    executorInvocationAuthorizationDecisionOnly: true,
    executorInvocationAuthorizationResultIsInertData: true,

    executorInvocationAuthorizationState:
      "EXECUTOR_INVOCATION_AUTHORIZED",

    controlledDispatch: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "controlledDispatch"
      ],

    dispatchAuthorization: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "dispatchAuthorization"
      ],

    activeAdmission: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "activeAdmission"
      ],

    authorization: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "authorization"
      ],

    eligibility: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "eligibility"
      ],

    consumption: {} as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "consumption"
      ],

    receiptState: "EXECUTION_SUCCEEDED" as
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult[
        "receiptState"
      ],

    executedOperation: "inspect-approved-repository-state",

    approvedExecutionScope: ["repository:read"],
    provenance: ["DEV-272:test"],

    authorizationBoundaries: [
      "DEV-272:test-authorization-boundary"
    ],

    scopeBoundaries: [
      "DEV-272:test-scope-boundary"
    ],

    verificationEvidence: [
      "DEV-272:test-verification"
    ],

    acceptanceEvidence: [
      "DEV-272:test-acceptance"
    ],

    packagingEvidence: [
      "DEV-272:test-packaging"
    ],

    packageVerificationEvidence: [
      "DEV-272:test-package-verification"
    ],

    admissionEvidence: [
      "DEV-272:test-admission"
    ],

    consumptionEvidence: [
      "DEV-272:test-consumption"
    ],

    activeAdmissionEligibilityEvidence: [
      "DEV-272:test-active-admission-eligibility"
    ],

    activeAdmissionAuthorizationEvidence: [
      "DEV-272:test-active-admission-authorization"
    ],

    controlledActiveAdmissionEvidence: [
      "DEV-272:test-controlled-active-admission"
    ],

    dispatchAuthorizationEvidence: [
      "DEV-272:test-dispatch-authorization"
    ],

    controlledDispatchEvidence: [
      "DEV-271:CONTROLLED_DISPATCH_ACCEPTED"
    ],

    executorInvocationAuthorizationEvidence: [
      "DEV-272:EXECUTOR_INVOCATION_AUTHORIZED"
    ],

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

    futureControlledExecutorInvocationBoundaryRequired: true,
    futureExecutionBoundaryRequired: true
  };
}

test(
  "DEV-273 accepts the exact authorized DEV-272 predecessor",
  () => {
    const predecessor = validPredecessor();

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.equal(result.version, "DEV-273");
    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.invoked, true);

    assert.equal(
      result.invocationState,
      "CONTROLLED_EXECUTOR_INVOKED"
    );

    assert.equal(
      result.invocationAuthorization,
      predecessor
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.equal(result.blockedReasons.length, 0);
  }
);

test(
  "DEV-273 successful result remains inert and non-executing",
  () => {
    const result =
      buildControlledExecutorInvocationFoundation(
        validPredecessor()
      );

    assert.equal(
      result.controlledExecutorInvocationBoundaryOnly,
      true
    );

    assert.equal(
      result.controlledExecutorInvocationResultIsInertData,
      true
    );

    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
    assert.equal(result.futureExecutionBoundaryRequired, true);
  }
);

test(
  "DEV-273 records deterministic controlled-invocation evidence",
  () => {
    const result =
      buildControlledExecutorInvocationFoundation(
        validPredecessor()
      );

    assert.deepEqual(
      result.controlledExecutorInvocationEvidence,
      [
        "DEV-273:INVOCATION_AUTHORIZATION_PREDECESSOR_VALIDATED",
        "DEV-273:CONTROLLED_EXECUTOR_INVOCATION_BOUNDARY_CROSSED",
        "DEV-273:CONTROLLED_EXECUTOR_INVOKED",
        "DEV-273:INVOCATION_RESULT_INERT",
        "DEV-273:EXECUTOR_IMPLEMENTATION_NOT_CALLED",
        "DEV-273:OPERATION_NOT_EXECUTED",
        "DEV-273:FUTURE_EXECUTION_BOUNDARY_REQUIRED"
      ]
    );
  }
);

test(
  "DEV-273 preserves validated predecessor payload",
  () => {
    const predecessor = validPredecessor();

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.equal(
      result.controlledDispatch,
      predecessor.controlledDispatch
    );

    assert.equal(
      result.dispatchAuthorization,
      predecessor.dispatchAuthorization
    );

    assert.equal(
      result.activeAdmission,
      predecessor.activeAdmission
    );

    assert.equal(
      result.authorization,
      predecessor.authorization
    );

    assert.equal(
      result.eligibility,
      predecessor.eligibility
    );

    assert.equal(
      result.consumption,
      predecessor.consumption
    );

    assert.equal(
      result.receiptState,
      predecessor.receiptState
    );

    assert.equal(
      result.executedOperation,
      predecessor.executedOperation
    );
  }
);

test(
  "DEV-273 copies predecessor arrays into inert result data",
  () => {
    const predecessor = validPredecessor();

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.notEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.notEqual(
      result.provenance,
      predecessor.provenance
    );

    assert.notEqual(
      result.controlledDispatchEvidence,
      predecessor.controlledDispatchEvidence
    );

    assert.notEqual(
      result.executorInvocationAuthorizationEvidence,
      predecessor.executorInvocationAuthorizationEvidence
    );

    assert.deepEqual(
      result.approvedExecutionScope,
      predecessor.approvedExecutionScope
    );

    assert.deepEqual(
      result.provenance,
      predecessor.provenance
    );
  }
);

test(
  "DEV-273 rejected result releases no predecessor payload",
  () => {
    const predecessor = {
      ...validPredecessor(),
      trusted: false
    };

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.equal(result.trusted, false);
    assert.equal(result.ready, false);
    assert.equal(result.invoked, false);

    assert.equal(
      result.invocationState,
      "CONTROLLED_EXECUTOR_NOT_INVOKED"
    );

    assert.equal(result.invocationAuthorization, null);
    assert.equal(result.controlledDispatch, null);
    assert.equal(result.dispatchAuthorization, null);
    assert.equal(result.activeAdmission, null);
    assert.equal(result.authorization, null);
    assert.equal(result.eligibility, null);
    assert.equal(result.consumption, null);
    assert.equal(result.receiptState, null);
    assert.equal(result.executedOperation, null);

    assert.deepEqual(result.approvedExecutionScope, []);
    assert.deepEqual(result.provenance, []);
    assert.deepEqual(result.controlledDispatchEvidence, []);
    assert.deepEqual(
      result.executorInvocationAuthorizationEvidence,
      []
    );

    assert.deepEqual(
      result.controlledExecutorInvocationEvidence,
      []
    );
  }
);

test(
  "DEV-273 rejection remains deny-by-default",
  () => {
    const predecessor = {
      ...validPredecessor(),
      executorInvocationAuthorized: false
    };

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.invoked, false);
    assert.equal(result.mayInvokeExecutor, false);
    assert.equal(result.mayExecuteOperation, false);
    assert.equal(result.mayModifyRepository, false);
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
    assert.equal(result.futureExecutionBoundaryRequired, true);
  }
);

test(
  "DEV-273 rejects predecessor containing blocked reasons",
  () => {
    const predecessor = {
      ...validPredecessor(),
      blockedReasons: ["UPSTREAM_BLOCK"]
    };

    const result =
      buildControlledExecutorInvocationFoundation(predecessor);

    assert.equal(result.invoked, false);

    assert.ok(
      result.blockedReasons.includes(
        "PREDECESSOR_CONTAINS_BLOCKED_REASONS"
      )
    );
  }
);

test(
  "DEV-273 output does not grant operation-execution authority",
  () => {
    const result =
      buildControlledExecutorInvocationFoundation(
        validPredecessor()
      );

    assert.equal(result.mayCreateExecutionAuthorization, false);
    assert.equal(result.mayAuthorizeDownstreamAction, false);
    assert.equal(result.mayAdmitIntoActiveExecutor, false);
    assert.equal(result.mayActivateAdmission, false);
    assert.equal(result.mayDispatch, false);

    assert.equal(result.mayInvokeExecutor, false);
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
    assert.equal(result.mayPerformNetworkExecution, false);
    assert.equal(result.mayPerformExternalSideEffects, false);
  }
);

const invalidCases: Array<{
  name: string;
  mutate: (
    predecessor:
      RiverDevControlledExecutorInvocationAuthorizationFoundationResult
  ) => RiverDevControlledExecutorInvocationAuthorizationFoundationResult;
  expectedReason: string;
}> = [
  {
    name: "untrusted predecessor",
    mutate: predecessor => ({
      ...predecessor,
      trusted: false
    }),
    expectedReason: "PREDECESSOR_NOT_TRUSTED"
  },
  {
    name: "unready predecessor",
    mutate: predecessor => ({
      ...predecessor,
      ready: false
    }),
    expectedReason: "PREDECESSOR_NOT_READY"
  },
  {
    name: "unauthorized invocation",
    mutate: predecessor => ({
      ...predecessor,
      executorInvocationAuthorized: false
    }),
    expectedReason: "EXECUTOR_INVOCATION_NOT_AUTHORIZED"
  },
  {
    name: "unauthorized state",
    mutate: predecessor => ({
      ...predecessor,
      executorInvocationAuthorizationState:
        "EXECUTOR_INVOCATION_UNAUTHORIZED"
    }),
    expectedReason:
      "INVALID_EXECUTOR_INVOCATION_AUTHORIZATION_STATE"
  },
  {
    name: "missing controlled dispatch",
    mutate: predecessor => ({
      ...predecessor,
      controlledDispatch: null
    }),
    expectedReason: "CONTROLLED_DISPATCH_MISSING"
  },
  {
    name: "missing dispatch authorization",
    mutate: predecessor => ({
      ...predecessor,
      dispatchAuthorization: null
    }),
    expectedReason: "DISPATCH_AUTHORIZATION_MISSING"
  },
  {
    name: "missing active admission",
    mutate: predecessor => ({
      ...predecessor,
      activeAdmission: null
    }),
    expectedReason: "ACTIVE_ADMISSION_MISSING"
  },
  {
    name: "missing authorization",
    mutate: predecessor => ({
      ...predecessor,
      authorization: null
    }),
    expectedReason: "AUTHORIZATION_MISSING"
  },
  {
    name: "missing eligibility",
    mutate: predecessor => ({
      ...predecessor,
      eligibility: null
    }),
    expectedReason: "ELIGIBILITY_MISSING"
  },
  {
    name: "missing consumption",
    mutate: predecessor => ({
      ...predecessor,
      consumption: null
    }),
    expectedReason: "CONSUMPTION_MISSING"
  },
  {
    name: "missing receipt state",
    mutate: predecessor => ({
      ...predecessor,
      receiptState: null
    }),
    expectedReason: "RECEIPT_STATE_MISSING"
  },
  {
    name: "missing executed operation",
    mutate: predecessor => ({
      ...predecessor,
      executedOperation: null
    }),
    expectedReason: "EXECUTED_OPERATION_MISSING"
  },
  {
    name: "empty approved scope",
    mutate: predecessor => ({
      ...predecessor,
      approvedExecutionScope: []
    }),
    expectedReason: "APPROVED_EXECUTION_SCOPE_EMPTY"
  },
  {
    name: "empty provenance",
    mutate: predecessor => ({
      ...predecessor,
      provenance: []
    }),
    expectedReason: "PROVENANCE_EMPTY"
  },
  {
    name: "empty dispatch evidence",
    mutate: predecessor => ({
      ...predecessor,
      controlledDispatchEvidence: []
    }),
    expectedReason: "CONTROLLED_DISPATCH_EVIDENCE_EMPTY"
  },
  {
    name: "empty invocation authorization evidence",
    mutate: predecessor => ({
      ...predecessor,
      executorInvocationAuthorizationEvidence: []
    }),
    expectedReason:
      "EXECUTOR_INVOCATION_AUTHORIZATION_EVIDENCE_EMPTY"
  },
  {
    name: "predecessor blocked reasons",
    mutate: predecessor => ({
      ...predecessor,
      blockedReasons: ["UPSTREAM_BLOCK"]
    }),
    expectedReason:
      "PREDECESSOR_CONTAINS_BLOCKED_REASONS"
  }
];

for (const invalidCase of invalidCases) {
  test(
    `DEV-273 rejects ${invalidCase.name}`,
    () => {
      const predecessor =
        invalidCase.mutate(validPredecessor());

      const result =
        buildControlledExecutorInvocationFoundation(
          predecessor
        );

      assert.equal(result.trusted, false);
      assert.equal(result.ready, false);
      assert.equal(result.invoked, false);

      assert.equal(
        result.invocationState,
        "CONTROLLED_EXECUTOR_NOT_INVOKED"
      );

      assert.ok(
        result.blockedReasons.includes(
          invalidCase.expectedReason
        )
      );

      assert.equal(result.invocationAuthorization, null);
      assert.equal(result.controlledDispatch, null);
      assert.equal(result.executedOperation, null);

      assert.equal(result.mayInvokeExecutor, false);
      assert.equal(result.mayExecuteOperation, false);
      assert.equal(result.mayModifyRepository, false);
      assert.equal(result.mayPerformNetworkExecution, false);
      assert.equal(result.mayPerformExternalSideEffects, false);
    }
  );
}

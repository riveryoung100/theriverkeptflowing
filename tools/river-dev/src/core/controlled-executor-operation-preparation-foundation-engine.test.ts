import assert from "node:assert/strict";
import test from "node:test";

import type {
  RiverDevControlledExecutorOperationAdmissionFoundation
} from "../types";

import {
  buildControlledExecutorOperationPreparationFoundation
} from "./controlled-executor-operation-preparation-foundation-engine";

function createAdmission(
  overrides: Partial<RiverDevControlledExecutorOperationAdmissionFoundation> = {}
): RiverDevControlledExecutorOperationAdmissionFoundation {
  return {
    trusted: true,
    ready: true,
    admitted: true,

    defaultPolicy: "DENY",
    admissionDecisionOnly: true,

    executionRequest:
      "inspect approved repository state",

    proposedOperation:
      "inspect-approved-repository-state",

    requiredCapability:
      "inspect-approved-repository-state",

    authorizedCapabilities: [
      "inspect-approved-repository-state"
    ],

    operationRepresentedByAuthorizedCapability:
      true,

    approvedExecutionScope: [
      "tools/river-dev/src/core/example.ts"
    ],

    provenance: [
      "DEV-249 test admission"
    ],

    authorizationBoundaries: [
      "admission does not grant execution"
    ],

    scopeBoundaries: [
      "scope may not expand"
    ],

    blockedReasons: [],

    admissionMayCreateAuthorization: false,
    admissionMayExpandScope: false,
    admissionMayExecuteOperation: false,

    ...overrides
  };
}

test(
  "prepares a trusted admitted operation deterministically",
  () => {
    const admission =
      createAdmission();

    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    assert.equal(result.trusted, true);
    assert.equal(result.ready, true);
    assert.equal(result.prepared, true);

    assert.equal(result.defaultPolicy, "DENY");
    assert.equal(result.preparationOnly, true);

    assert.equal(
      result.preparedOperation,
      admission.proposedOperation
    );

    assert.equal(
      result.requiredCapability,
      admission.requiredCapability
    );

    assert.deepEqual(result.blockedReasons, []);
  }
);

test(
  "fails closed when admission is not trusted",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            trusted: false
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation admission must be trusted before preparation"
      )
    );
  }
);

test(
  "fails closed when admission is not ready",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            ready: false
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation admission must be ready before preparation"
      )
    );
  }
);

test(
  "fails closed when operation was not admitted",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            admitted: false
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation must be explicitly admitted before preparation"
      )
    );
  }
);

test(
  "fails closed when deny-by-default predecessor policy is violated",
  () => {
    const admission =
      {
        ...createAdmission(),
        defaultPolicy: "ALLOW"
      } as unknown as RiverDevControlledExecutorOperationAdmissionFoundation;

    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation admission must preserve deny-by-default policy"
      )
    );
  }
);

test(
  "fails closed when predecessor is not admission-decision-only",
  () => {
    const admission =
      {
        ...createAdmission(),
        admissionDecisionOnly: false
      } as unknown as RiverDevControlledExecutorOperationAdmissionFoundation;

    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation admission must remain an admission decision only"
      )
    );
  }
);

test(
  "fails closed when operation lacks authorized capability representation",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            operationRepresentedByAuthorizedCapability:
              false
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation must be represented by an authorized capability"
      )
    );
  }
);

test(
  "fails closed when predecessor contains blocking reasons",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            blockedReasons: [
              "predecessor blocked"
            ]
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "operation admission contains predecessor blocking reasons"
      )
    );
  }
);

test(
  "fails closed when execution request is empty",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            executionRequest: "   "
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "governed execution request is required for preparation"
      )
    );
  }
);

test(
  "fails closed when authorized capability evidence is empty",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            authorizedCapabilities: []
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "authorized capability evidence is required for preparation"
      )
    );
  }
);

test(
  "fails closed when required capability is not authorized",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            authorizedCapabilities: [
              "prepare-approved-repository-change"
            ]
          })
      });

    assert.equal(result.prepared, false);

    assert.ok(
      result.blockedReasons.includes(
        "required capability must be present in authorized capability evidence"
      )
    );
  }
);

test(
  "preserves approved execution scope without expanding it",
  () => {
    const admission =
      createAdmission({
        approvedExecutionScope: [
          "z/path.ts",
          "a/path.ts",
          "z/path.ts"
        ]
      });

    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    assert.deepEqual(
      result.approvedExecutionScope,
      [
        "a/path.ts",
        "z/path.ts"
      ]
    );

    assert.equal(
      result.approvedExecutionScope.includes(
        "outside/scope.ts"
      ),
      false
    );
  }
);

test(
  "preserves authorization provenance and adds DEV-250 provenance",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            provenance: [
              "upstream authorization",
              "upstream authorization"
            ]
          })
      });

    assert.ok(
      result.provenance.includes(
        "upstream authorization"
      )
    );

    assert.ok(
      result.provenance.includes(
        "DEV-250 preparation derived from DEV-249 operation admission"
      )
    );

    assert.equal(
      result.provenance.filter(
        (value) =>
          value === "upstream authorization"
      ).length,
      1
    );
  }
);

test(
  "preserves explicit preparation-only authority boundaries",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission()
      });

    assert.equal(
      result.preparationMayCreateAuthorization,
      false
    );

    assert.equal(
      result.preparationMayExpandScope,
      false
    );

    assert.equal(
      result.preparationMayExecuteOperation,
      false
    );

    assert.equal(
      result.preparationMayModifyRepository,
      false
    );

    assert.ok(
      result.authorizationBoundaries.includes(
        "operation preparation does not grant command execution authority"
      )
    );

    assert.ok(
      result.scopeBoundaries.includes(
        "operation preparation cannot execute the prepared operation"
      )
    );
  }
);

test(
  "normalizes preparation evidence deterministically",
  () => {
    const admission =
      createAdmission({
        approvedExecutionScope: [
          "b.ts",
          "a.ts",
          "b.ts"
        ],

        provenance: [
          "z provenance",
          "a provenance",
          "z provenance"
        ]
      });

    const first =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    const second =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission: admission
      });

    assert.deepEqual(first, second);

    assert.deepEqual(
      first.approvedExecutionScope,
      [
        "a.ts",
        "b.ts"
      ]
    );

    assert.deepEqual(
      first.provenance,
      [
        "a provenance",
        "DEV-250 preparation derived from DEV-249 operation admission",
        "z provenance"
      ]
    );
  }
);

test(
  "does not mutate predecessor admission arrays",
  () => {
    const admission =
      createAdmission({
        approvedExecutionScope: [
          "z.ts",
          "a.ts"
        ],

        provenance: [
          "z",
          "a"
        ],

        authorizedCapabilities: [
          "validate-approved-repository-change",
          "inspect-approved-repository-state"
        ]
      });

    const originalScope =
      [...admission.approvedExecutionScope];

    const originalProvenance =
      [...admission.provenance];

    const originalCapabilities =
      [...admission.authorizedCapabilities];

    buildControlledExecutorOperationPreparationFoundation({
      operationAdmission: admission
    });

    assert.deepEqual(
      admission.approvedExecutionScope,
      originalScope
    );

    assert.deepEqual(
      admission.provenance,
      originalProvenance
    );

    assert.deepEqual(
      admission.authorizedCapabilities,
      originalCapabilities
    );
  }
);

test(
  "blocked preparation remains non-authoritative",
  () => {
    const result =
      buildControlledExecutorOperationPreparationFoundation({
        operationAdmission:
          createAdmission({
            admitted: false,
            ready: false
          })
      });

    assert.equal(result.prepared, false);
    assert.equal(result.ready, false);
    assert.equal(result.trusted, false);

    assert.equal(
      result.preparationMayCreateAuthorization,
      false
    );

    assert.equal(
      result.preparationMayExpandScope,
      false
    );

    assert.equal(
      result.preparationMayExecuteOperation,
      false
    );

    assert.equal(
      result.preparationMayModifyRepository,
      false
    );
  }
);

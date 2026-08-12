import type {
  RiverDevGovernedExecutorIntegrationVerificationFoundation,
  RiverDevGovernedExecutorIntegrationVerificationFoundationInput
} from "../types";

export function buildGovernedExecutorIntegrationVerificationFoundation(
  input: RiverDevGovernedExecutorIntegrationVerificationFoundationInput
): RiverDevGovernedExecutorIntegrationVerificationFoundation {
  const predecessor =
    input.governedExecutorIntegration;

  const blockedReasons: string[] = [];
  const verificationState: string[] = [];
  const verificationEvidence: string[] = [];

  if (predecessor.version !== "DEV-291") {
    blockedReasons.push(
      "INVALID_GOVERNED_EXECUTOR_INTEGRATION_VERSION"
    );
  }

  if (
    predecessor.source !==
    "governed-executor-integration-foundation"
  ) {
    blockedReasons.push(
      "INVALID_GOVERNED_EXECUTOR_INTEGRATION_SOURCE"
    );
  }

  if (predecessor.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEFAULT_POLICY_NOT_DENY"
    );
  }

  if (predecessor.integrationDecisionOnly !== true) {
    blockedReasons.push(
      "INTEGRATION_NOT_DECISION_ONLY"
    );
  }

  if (predecessor.integrationMayCreateAuthorization !== false) {
    blockedReasons.push(
      "INTEGRATION_MAY_CREATE_AUTHORIZATION"
    );
  }

  if (predecessor.integrationMayExpandScope !== false) {
    blockedReasons.push(
      "INTEGRATION_MAY_EXPAND_SCOPE"
    );
  }

  if (predecessor.integrationMayModifyRepository !== false) {
    blockedReasons.push(
      "INTEGRATION_MAY_MODIFY_REPOSITORY"
    );
  }

  if (predecessor.integrationMayExecuteOperation !== false) {
    blockedReasons.push(
      "INTEGRATION_MAY_EXECUTE_OPERATION"
    );
  }

  if (
    predecessor.requestedMode === "apply" &&
    predecessor.effectiveMode === "apply" &&
    predecessor.authorized !== true
  ) {
    blockedReasons.push(
      "UNAUTHORIZED_APPLY_EFFECTIVE_MODE"
    );
  }

  if (
    predecessor.requestedMode === "apply" &&
    predecessor.effectiveMode === "apply" &&
    predecessor.authorizationSatisfied !== true
  ) {
    blockedReasons.push(
      "UNSATISFIED_AUTHORIZATION_APPLY_EFFECTIVE_MODE"
    );
  }

  if (
    predecessor.requestedMode === "apply" &&
    predecessor.effectiveMode === "apply" &&
    predecessor.trusted !== true
  ) {
    blockedReasons.push(
      "UNTRUSTED_APPLY_EFFECTIVE_MODE"
    );
  }

  if (
    predecessor.requestedMode === "apply" &&
    predecessor.effectiveMode === "apply" &&
    predecessor.ready !== true
  ) {
    blockedReasons.push(
      "UNREADY_APPLY_EFFECTIVE_MODE"
    );
  }

  if (
    predecessor.blockedReasons.length > 0 &&
    predecessor.effectiveMode === "apply"
  ) {
    blockedReasons.push(
      "BLOCKED_PREDECESSOR_APPLY_EFFECTIVE_MODE"
    );
  }

  verificationState.push(
    `requested-mode:${predecessor.requestedMode}`,
    `effective-mode:${predecessor.effectiveMode}`,
    `trusted:${predecessor.trusted}`,
    `ready:${predecessor.ready}`,
    `authorized:${predecessor.authorized}`,
    `authorization-satisfied:${predecessor.authorizationSatisfied}`
  );

  verificationEvidence.push(
    predecessor.source,
    predecessor.version,
    ...predecessor.provenance
  );

  const trusted =
    blockedReasons.length === 0;

  const ready =
    trusted;

  const verified =
    ready;

  return {
    version: "DEV-292",
    source:
      "governed-executor-integration-verification-foundation",

    trusted,
    ready,
    verified,

    defaultPolicy: "DENY",
    verificationDecisionOnly: true,

    governedExecutorIntegration:
      predecessor,

    verificationState,
    verificationEvidence,
    blockedReasons,

    verificationMayCreateAuthorization:
      false,

    verificationMayExpandScope:
      false,

    verificationMayModifyRepository:
      false,

    verificationMayExecuteOperation:
      false,

    verificationMayPush:
      false,

    verificationMayDeploy:
      false
  };
}

import type {
  RiverDevGovernedExecutorIntegrationFoundation,
  RiverDevGovernedExecutorIntegrationFoundationInput
} from "../types";

export function buildGovernedExecutorIntegrationFoundation(
  input: RiverDevGovernedExecutorIntegrationFoundationInput
): RiverDevGovernedExecutorIntegrationFoundation {
  const authorization =
    input.executionAuthorization;

  const blockedReasons: string[] = [];

  if (authorization.trusted !== true) {
    blockedReasons.push(
      "EXECUTION_AUTHORIZATION_NOT_TRUSTED"
    );
  }

  if (authorization.ready !== true) {
    blockedReasons.push(
      "EXECUTION_AUTHORIZATION_NOT_READY"
    );
  }

  if (
    input.requestedMode === "apply" &&
    authorization.authorized !== true
  ) {
    blockedReasons.push(
      "APPLY_NOT_AUTHORIZED"
    );
  }

  if (
    input.requestedMode === "apply" &&
    authorization.requiredCapabilityAuthorized !== true
  ) {
    blockedReasons.push(
      "REQUIRED_CAPABILITY_NOT_AUTHORIZED"
    );
  }

  const authorizationSatisfied =
    input.requestedMode === "dry-run" ||
    (
      authorization.authorized === true &&
      authorization.requiredCapabilityAuthorized === true
    );

  const trusted =
    authorization.trusted === true;

  const ready =
    trusted &&
    authorization.ready === true &&
    blockedReasons.length === 0;

  const authorized =
    ready &&
    authorizationSatisfied;

  const effectiveMode =
    input.requestedMode === "apply" &&
    authorized
      ? "apply"
      : "dry-run";

  return {
    version: "DEV-291",
    source:
      "governed-executor-integration-foundation",

    trusted,
    ready,
    authorized,

    defaultPolicy: "DENY",
    integrationDecisionOnly: true,

    requestedMode:
      input.requestedMode,

    effectiveMode,

    executionAuthorization:
      authorization,

    authorizationRequiredForApply:
      true,

    authorizationSatisfied,

    blockedReasons,

    provenance: [
      authorization.source,
      "DEV-291 governed executor integration foundation"
    ],

    integrationMayCreateAuthorization:
      false,

    integrationMayExpandScope:
      false,

    integrationMayModifyRepository:
      false,

    integrationMayExecuteOperation:
      false
  };
}

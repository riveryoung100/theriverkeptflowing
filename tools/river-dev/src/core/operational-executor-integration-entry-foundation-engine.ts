import type {
  RiverDevOperationalExecutorIntegrationEntryFoundationInput,
  RiverDevOperationalExecutorIntegrationEntryFoundationResult
} from "../types";

const OBJECTIVE =
  "Establish a fail-closed operational executor entry decision that separates requested apply mode from preexisting governed operation-execution authorization.";

export function establishOperationalExecutorIntegrationEntryFoundation(
  input:
    RiverDevOperationalExecutorIntegrationEntryFoundationInput
): RiverDevOperationalExecutorIntegrationEntryFoundationResult {

  const applyRequested =
    input.requestedMode === "apply";

  const authorizationState =
    input.authorization?.authorizationState ??
    "AUTHORIZATION_ABSENT";

  const governedAuthorizationPresent =
    input.authorization !== null;

  const governedApplyAuthorized =
    applyRequested &&
    authorizationState ===
      "OPERATION_EXECUTION_AUTHORIZED";

  if (!applyRequested) {

    return {
      version: "DEV-314",

      source:
        "operational-executor-integration-entry-foundation-engine",

      objective: OBJECTIVE,

      defaultPolicy: "DENY",

      requestedMode:
        "dry-run",

      effectiveMode:
        "dry-run",

      entryState:
        "DRY_RUN_ADMITTED",

      admitted:
        true,

      applyRequested:
        false,

      governedAuthorizationPresent,

      governedApplyAuthorized:
        false,

      requestedApplyIsAuthorization:
        false,

      createsAuthorization:
        false,

      upgradesAuthorization:
        false,

      grantsArbitraryRepositoryMutation:
        false,

      dryRunIsNonMutating:
        true,

      operationalExecutionPerformed:
        false,

      authorizationState,

      evidence: [
        "Dry-run requested.",
        "Dry-run admitted without mutation authority.",
        "Requested mode did not create execution authorization."
      ],

      blockedReasons:
        []
    };
  }

  if (!governedApplyAuthorized) {

    const blockedReasons: string[] = [];

    if (!governedAuthorizationPresent) {
      blockedReasons.push(
        "Apply denied because governed operation-execution authorization is absent."
      );
    }
    else if (
      authorizationState !==
      "OPERATION_EXECUTION_AUTHORIZED"
    ) {
      blockedReasons.push(
        "Apply denied because governed operation-execution authorization is not OPERATION_EXECUTION_AUTHORIZED."
      );
    }

    return {
      version: "DEV-314",

      source:
        "operational-executor-integration-entry-foundation-engine",

      objective: OBJECTIVE,

      defaultPolicy: "DENY",

      requestedMode:
        "apply",

      effectiveMode:
        "dry-run",

      entryState:
        "APPLY_DENIED",

      admitted:
        false,

      applyRequested:
        true,

      governedAuthorizationPresent,

      governedApplyAuthorized:
        false,

      requestedApplyIsAuthorization:
        false,

      createsAuthorization:
        false,

      upgradesAuthorization:
        false,

      grantsArbitraryRepositoryMutation:
        false,

      dryRunIsNonMutating:
        true,

      operationalExecutionPerformed:
        false,

      authorizationState,

      evidence: [
        "Apply was requested.",
        "Apply request alone was not treated as authorization.",
        "Fail-closed operational entry policy applied."
      ],

      blockedReasons
    };
  }

  return {
    version: "DEV-314",

    source:
      "operational-executor-integration-entry-foundation-engine",

    objective: OBJECTIVE,

    defaultPolicy: "DENY",

    requestedMode:
      "apply",

    effectiveMode:
      "apply",

    entryState:
      "APPLY_ADMITTED",

    admitted:
      true,

    applyRequested:
      true,

    governedAuthorizationPresent:
      true,

    governedApplyAuthorized:
      true,

    requestedApplyIsAuthorization:
      false,

    createsAuthorization:
      false,

    upgradesAuthorization:
      false,

    grantsArbitraryRepositoryMutation:
      false,

    dryRunIsNonMutating:
      true,

    operationalExecutionPerformed:
      false,

    authorizationState:
      "OPERATION_EXECUTION_AUTHORIZED",

    evidence: [
      "Apply was explicitly requested.",
      "Preexisting governed operation-execution authorization was present.",
      "Authorization state was OPERATION_EXECUTION_AUTHORIZED.",
      "Operational entry admitted apply without creating or expanding authority.",
      "DEV-314 performed no operational execution."
    ],

    blockedReasons:
      []
  };
}

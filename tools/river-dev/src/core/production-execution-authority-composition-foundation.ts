import type {
  RiverDevProductionExecutionAuthorityCompositionFoundation,
  RiverDevProductionExecutionAuthorityCompositionFoundationInput
} from "../types";

export function createProductionExecutionAuthorityCompositionFoundation(
  input:
    RiverDevProductionExecutionAuthorityCompositionFoundationInput
): RiverDevProductionExecutionAuthorityCompositionFoundation {
  const authorityInput =
    input.authorityInput;

  const blockedReasons = [
    ...authorityInput.blockedReasons
  ];

  if (!authorityInput.trusted) {
    blockedReasons.push(
      "production execution authority composition requires trusted DEV-321 authority input"
    );
  }

  if (!authorityInput.ready) {
    blockedReasons.push(
      "production execution authority composition requires ready DEV-321 authority input"
    );
  }

  if (
    authorityInput.authorityState !==
    "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY"
  ) {
    blockedReasons.push(
      "production execution authority composition requires ready authority state"
    );
  }

  const trusted =
    authorityInput.trusted &&
    authorityInput.ready &&
    authorityInput.authorityState ===
      "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY" &&
    blockedReasons.length === 0;

  const ready =
    trusted;

  return {
    version:
      "DEV-322",

    source:
      "production-execution-authority-composition-foundation",

    objective:
      "Compose trusted production execution authority evidence without creating or broadening authorization.",

    trusted,
    ready,

    requestedMode:
      authorityInput.requestedMode,

    authorityInput,

    humanAuthorization:
      authorityInput.humanAuthorization,

    repositoryAuthorization:
      authorityInput.repositoryAuthorization,

    approvedScope:
      authorityInput.approvedScope,

    approvalEvidence:
      authorityInput.approvalEvidence,

    compositionState:
      ready
        ? "PRODUCTION_EXECUTION_AUTHORITY_COMPOSED"
        : "PRODUCTION_EXECUTION_AUTHORITY_COMPOSITION_BLOCKED",

    provenance: [
      ...authorityInput.provenance,
      "DEV-321 production execution authority input preserved",
      "human authorization evidence preserved",
      "repository authorization evidence preserved",
      "approved execution scope preserved",
      "explicit governance approval evidence preserved",
      "production execution authority composition remains non-executing"
    ],

    blockedReasons,

    requestedApplyIsAuthorization:
      false,

    createsExecutionAuthorization:
      false,

    upgradesExecutionAuthorization:
      false,

    synthesizesExecutionAuthorization:
      false,

    broadensApprovedScope:
      false,

    mayInvokeDev317:
      false,

    mayInvokeDev318:
      false,

    mayInvokeDev319:
      false,

    mayExecuteOperation:
      false,

    mayInvokeExecutor:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommitRepositoryChanges:
      false,

    mayPushRepositoryChanges:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayUseNetwork:
      false,

    mayInvokeShell:
      false
  };
}

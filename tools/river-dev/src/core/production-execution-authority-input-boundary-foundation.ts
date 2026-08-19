import type {
    RiverDevProductionExecutionAuthorityInputBoundaryFoundation,
    RiverDevProductionExecutionAuthorityInputBoundaryFoundationInput
} from "../types";


function hasNonEmptyStrings(
    values:
        readonly string[]
): boolean {

    return (
        values.length > 0 &&
        values.every(
            (value) =>
                value.trim().length > 0
        )
    );

}


export function establishProductionExecutionAuthorityInputBoundaryFoundation(
    input:
        RiverDevProductionExecutionAuthorityInputBoundaryFoundationInput
): RiverDevProductionExecutionAuthorityInputBoundaryFoundation {

    const blockedReasons:
        string[] = [];

    const provenance:
        string[] = [];


    const humanAuthorization =
        input.humanAuthorization;

    if (humanAuthorization === null) {

        blockedReasons.push(
            "Explicit human authorization evidence is required."
        );

    }
    else {

        if (humanAuthorization.authorized !== true) {
            blockedReasons.push(
                "Human authorization must be affirmative."
            );
        }

        if (humanAuthorization.authorizedBy.trim().length === 0) {
            blockedReasons.push(
                "Human authorizer identity is required."
            );
        }

        if (humanAuthorization.authorizationId.trim().length === 0) {
            blockedReasons.push(
                "Human authorization ID is required."
            );
        }

        if (
            !hasNonEmptyStrings(
                humanAuthorization.authorizationSignals
            )
        ) {
            blockedReasons.push(
                "Human authorization signals are required."
            );
        }

        provenance.push(
            ...humanAuthorization.authorizationSignals
        );
    }


    const repositoryAuthorization =
        input.repositoryAuthorization;

    if (repositoryAuthorization === null) {

        blockedReasons.push(
            "Explicit repository authorization evidence is required."
        );

    }
    else {

        if (repositoryAuthorization.authorized !== true) {
            blockedReasons.push(
                "Repository authorization must be affirmative."
            );
        }

        if (repositoryAuthorization.repositoryRoot.trim().length === 0) {
            blockedReasons.push(
                "Authorized repository root is required."
            );
        }

        if (repositoryAuthorization.authorizationId.trim().length === 0) {
            blockedReasons.push(
                "Repository authorization ID is required."
            );
        }

        if (
            !hasNonEmptyStrings(
                repositoryAuthorization.authorizationSignals
            )
        ) {
            blockedReasons.push(
                "Repository authorization signals are required."
            );
        }

        provenance.push(
            ...repositoryAuthorization.authorizationSignals
        );
    }


    if (input.approvedScope === null) {
        blockedReasons.push(
            "Approved execution scope is required."
        );
    }


    const approvalEvidence =
        input.approvalEvidence;

    if (approvalEvidence === null) {

        blockedReasons.push(
            "Explicit governance approval evidence is required."
        );

    }
    else {

        if (approvalEvidence.approved !== true) {
            blockedReasons.push(
                "Governance approval must be affirmative."
            );
        }

        if (approvalEvidence.approvedBy.trim().length === 0) {
            blockedReasons.push(
                "Governance approver identity is required."
            );
        }

        if (approvalEvidence.approvalId.trim().length === 0) {
            blockedReasons.push(
                "Governance approval ID is required."
            );
        }

        if (
            !hasNonEmptyStrings(
                approvalEvidence.approvalSignals
            )
        ) {
            blockedReasons.push(
                "Governance approval signals are required."
            );
        }

        provenance.push(
            ...approvalEvidence.approvalSignals
        );
    }


    const normalizedProvenance =
        [
            ...new Set(
                provenance
                    .map(
                        (value) =>
                            value.trim()
                    )
                    .filter(
                        (value) =>
                            value.length > 0
                    )
            )
        ].sort();


    const normalizedBlockedReasons =
        [
            ...new Set(
                blockedReasons
            )
        ].sort();


    const ready =
        normalizedBlockedReasons.length === 0;


    return {
        version:
            "DEV-321",

        source:
            "production-execution-authority-input-boundary-foundation",

        objective:
            "Carry explicit production execution authority inputs without creating or broadening authorization.",

        trusted:
            ready,

        ready,

        requestedMode:
            input.requestedMode,

        humanAuthorization:
            input.humanAuthorization,

        repositoryAuthorization:
            input.repositoryAuthorization,

        approvedScope:
            input.approvedScope,

        approvalEvidence:
            input.approvalEvidence,

        authorityState:
            ready
                ? "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY"
                : "PRODUCTION_EXECUTION_AUTHORITY_INPUT_BLOCKED",

        provenance:
            normalizedProvenance,

        blockedReasons:
            normalizedBlockedReasons,

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

        mayConstructDev317AcquisitionInput:
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
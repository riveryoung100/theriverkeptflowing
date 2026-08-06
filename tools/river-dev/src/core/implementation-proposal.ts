import type {
    RiverDevImplementationPlan
} from "./planner";


export type RiverDevProposalOperationType =
    "write-file";


export interface RiverDevProposalWriteFileOperation {

    readonly type:
        "write-file";

    readonly path:
        string;

    readonly content:
        string;

    readonly overwrite:
        boolean;

    readonly reason:
        string;

}


export type RiverDevProposalOperation =
    RiverDevProposalWriteFileOperation;


export interface RiverDevImplementationProposal {

    readonly version:
        "1.0.0";

    readonly proposalId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly objective:
        string;

    readonly approved:
        boolean;

    readonly operations:
        readonly RiverDevProposalOperation[];

}


function assertNonEmpty(
    value:
        string,
    label:
        string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new TypeError(
            `${label} cannot be empty.`
        );
    }

}


export function validateImplementationProposal(
    plan:
        RiverDevImplementationPlan,
    proposal:
        RiverDevImplementationProposal
): void {

    assertNonEmpty(
        proposal.proposalId,
        "Proposal identifier"
    );

    assertNonEmpty(
        proposal.planId,
        "Proposal plan identifier"
    );

    assertNonEmpty(
        proposal.branch,
        "Proposal branch"
    );

    assertNonEmpty(
        proposal.objective,
        "Proposal objective"
    );

    if (
        proposal.approved !==
        true
    ) {
        throw new TypeError(
            "Implementation proposal must be approved."
        );
    }

    if (
        proposal.planId !==
        plan.planId
    ) {
        throw new TypeError(
            "Implementation proposal does not match the approved plan."
        );
    }

    if (
        proposal.branch !==
        plan.branch
    ) {
        throw new TypeError(
            "Implementation proposal branch does not match the approved plan."
        );
    }

    if (
        proposal.operations.length ===
        0
    ) {
        throw new TypeError(
            "Implementation proposal must contain at least one operation."
        );
    }

    const seenPaths =
        new Set<string>();

    for (
        const operation of
        proposal.operations
    ) {

        assertNonEmpty(
            operation.path,
            "Proposal operation path"
        );

        assertNonEmpty(
            operation.reason,
            "Proposal operation reason"
        );

        if (
            !plan.allowedPaths.includes(
                operation.path
            )
        ) {
            throw new TypeError(
                `Proposal path is outside the approved plan scope: ${operation.path}`
            );
        }

        if (
            plan.excludedPaths.includes(
                operation.path
            )
        ) {
            throw new TypeError(
                `Proposal path is excluded by the approved plan: ${operation.path}`
            );
        }

        if (
            seenPaths.has(
                operation.path
            )
        ) {
            throw new TypeError(
                `Duplicate proposal operation path: ${operation.path}`
            );
        }

        seenPaths.add(
            operation.path
        );

    }

}

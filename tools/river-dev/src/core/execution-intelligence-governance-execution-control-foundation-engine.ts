import type {
    RiverDevExecutionIntelligenceGovernanceExecutionControlFoundation,
    RiverDevExecutionIntelligenceGovernanceExecutionControlFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceExecutionControlFoundation(
    input: RiverDevExecutionIntelligenceGovernanceExecutionControlFoundationInput,
): RiverDevExecutionIntelligenceGovernanceExecutionControlFoundation {
    const {
        executionBoundary,
    } = input;

    const trustedExecutionBoundary =
        executionBoundary.trusted === true &&
        executionBoundary.controlled === true &&
        executionBoundary.blockedReasons.length === 0;

    const trusted =
        trustedExecutionBoundary;

    const controlled =
        trustedExecutionBoundary;

    /*
     * Generation III authorization semantics:
     *
     * `authorized` records governed execution-control eligibility inherited
     * from the trusted DEV-241 execution boundary. It does not grant command
     * execution, repository modification, commit, push, scope-expansion, or
     * autonomous execution authority.
     */
    const authorized =
        trustedExecutionBoundary;

    const blockedReasons: string[] = [];

    if (!trustedExecutionBoundary) {
        blockedReasons.push(
            "governance execution boundary is not eligible for execution control",
        );
    }

    const executionRequest =
        controlled
            ? [
                  "governed execution request created",
                  "trusted governance execution boundary preserved",
                  "approved execution scope preserved",
                  "execution request remains descriptive evidence",
                  "command execution remains separately governed",
              ]
            : [
                  "governed execution request blocked",
                  "trusted controlled governance execution boundary required",
              ];

    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-execution-control-foundation",

        objective:
            executionBoundary.objective,

        trusted,

        controlled,

        authorized,

        executionBoundary,

        executionRequest,

        executionControlState:
            controlled
                ? [
                      "governance execution boundary accepted",
                      "governance execution control established",
                      "governed execution request created",
                      "approved execution scope preserved",
                      "execution control remains separated from command execution",
                  ]
                : [
                      "governance execution control blocked",
                      "trusted controlled execution boundary required",
                  ],

        executionControlSignals:
            controlled
                ? [
                      "execution-boundary trust accepted for execution control",
                      "execution-boundary controlled state accepted for execution control",
                      "execution-control eligibility preserved",
                      "governed execution request established",
                      "runtime execution authority remains constrained",
                  ]
                : [
                      "governance execution control rejected",
                  ],

        provenance: [
            ...executionBoundary.provenance,
            "governance-execution-boundary-foundation:v1.0.0",
            "human authorization evidence preserved through execution control",
            "repository authorization evidence preserved through execution control",
            "explicit governance approval evidence preserved through execution control",
            "approved execution scope preserved through execution control",
            "governance execution-boundary provenance preserved",
            "governance execution-control provenance preserved",
        ],

        authorizationBoundaries: [
            ...executionBoundary.authorizationBoundaries,
            "trusted controlled governance execution boundary required",
            "authorized records governed control eligibility only",
            "authorized does not grant command execution authority",
            "execution request is descriptive governance evidence",
            "execution request does not independently modify the repository",
            "execution request does not independently execute arbitrary commands",
            "execution control cannot independently commit repository changes",
            "execution control cannot independently push repository changes",
            "execution control grants no autonomous execution authority",
        ],

        scopeBoundaries: [
            ...executionBoundary.scopeBoundaries,
            "approved execution scope preserved through execution control",
            "strict execution-control scope boundary maintained",
            "execution control cannot expand approved execution scope",
            "execution request cannot expand approved execution scope",
        ],

        blockedReasons,
    };
}

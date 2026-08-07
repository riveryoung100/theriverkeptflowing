import type {
    RiverDevContextUnderstanding,
    RiverDevImplementationPlan,
    RiverDevPlanningDecision
} from "../types";


function createDecision(
    path:
        string,
    score:
        number
):
    RiverDevPlanningDecision {

    return {

        path,

        priority:
            score,

        reason:
            score > 0
            ? "selected from context relevance intelligence"
            : "available repository artifact",

        action:
            path.includes("test")
            ? "modify"
            : "inspect"

    };

}


export function createImplementationPlan(
    understanding:
        RiverDevContextUnderstanding,
    objective:
        string
):
    RiverDevImplementationPlan {

    const decisions =
        understanding.relevance
            .filter(
                (item) =>
                    item.score >= 0
            )
            .map(
                (item) =>
                    createDecision(
                        item.path,
                        item.score
                    )
            )
            .sort(
                (a, b) =>
                    b.priority - a.priority
            );


    return {

        version:
            "1.0.0",

        objective,

        decisions,

        steps: [

            "inspect selected implementation artifacts",

            "validate relationships and dependencies",

            "apply approved implementation changes",

            "run required verification tests"

        ]

    };

}

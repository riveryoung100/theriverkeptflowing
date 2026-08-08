import type {
RiverDevExecutionReview,
RiverDevExecutionResult
} from "../types";

export function createExecutionReview(
result:
RiverDevExecutionResult
):
RiverDevExecutionReview {

const blocked =
result.blockedReasons.length > 0 ||
result.ready === false;

return {

version:
"1.0.0",

objective:
result.objective,

approved:
!blocked,

source:
"controlled-execution-result",

findings:
result.results.map(
(step) =>
`${step.taskId}:${step.state}`
),

blockedReasons:
result.blockedReasons

};

}

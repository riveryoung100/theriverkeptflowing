import type {
RiverDevExecutionApproval,
RiverDevExecutionReview
} from "../types";

export function createExecutionApproval(
review:
RiverDevExecutionReview
):
RiverDevExecutionApproval {

const blocked =
review.approved === false ||
review.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
review.objective,

approved:
!blocked,

approvals:
review.findings.map(
(finding) =>
({
taskId:
finding,

state:
blocked
? "blocked"
: "approved",

reason:
finding
})
),

blockedReasons:
review.blockedReasons

};

}



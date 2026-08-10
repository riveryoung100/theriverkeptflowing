import type {
RiverDevExecutionIntelligenceReviewFoundation,
RiverDevExecutionIntelligenceDecisionFoundation
} from "../types";

export function createExecutionIntelligenceDecision(
review:
RiverDevExecutionIntelligenceReviewFoundation
):
RiverDevExecutionIntelligenceDecisionFoundation {

const approved =
review.trusted === true &&
review.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-decision",

objective:
review.objective,

approved,

decision:
approved
?
"execute"
:
"hold",

actions:
approved
?
[
"controlled execution authorized",
"execution boundary preserved",
"human authorization maintained"
]
:
[
"execution withheld",
"human review required"
],

provenance:
approved
?
[
"review verification preserved",
"decision provenance preserved",
"authorization boundary maintained"
]
:
[
"review state preserved",
"decision boundary maintained"
],

blockedReasons:
approved
?
[]
:
[
"intelligence review not approved"
]

};

}

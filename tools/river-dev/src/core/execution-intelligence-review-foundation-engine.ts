import type {
RiverDevExecutionIntelligenceOversightFoundation,
RiverDevExecutionIntelligenceReviewFoundation
} from "../types";

export function createExecutionIntelligenceReview(
oversight:
RiverDevExecutionIntelligenceOversightFoundation
):
RiverDevExecutionIntelligenceReviewFoundation {

const trusted =
oversight.trusted === true &&
oversight.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-review",

objective:
oversight.objective,

trusted,

reviewState:
trusted
?
[
"intelligence oversight record accepted",
"intelligence review created",
"controlled intelligence review preserved"
]
:
[
"intelligence review restricted",
"intelligence oversight review required"
],

provenance:
trusted
?
[
"intelligence oversight verified",
"review provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence oversight state preserved",
"review boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence oversight not trusted"
]

};

}

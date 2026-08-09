import type {
RiverDevExecutionIntelligenceCompletionFoundation,
RiverDevExecutionIntelligenceCertificationFoundation
} from "../types";

export function createExecutionIntelligenceCertification(
completion:
RiverDevExecutionIntelligenceCompletionFoundation
):
RiverDevExecutionIntelligenceCertificationFoundation {

const trusted =
completion.trusted === true &&
completion.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-certification",

objective:
completion.objective,

trusted,

certificationState:
trusted
?
[
"intelligence completion record accepted",
"intelligence certification created",
"controlled intelligence validation preserved"
]
:
[
"intelligence certification restricted",
"intelligence completion review required"
],

provenance:
trusted
?
[
"intelligence completion verified",
"certification provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence completion state preserved",
"certification boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence completion not trusted"
]

};

}

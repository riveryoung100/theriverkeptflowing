import type {
RiverDevExecutionIntelligenceCertificationFoundation,
RiverDevExecutionIntelligenceCompletionFoundation
} from "../types";

export function createExecutionIntelligenceCompletion(
certification:
RiverDevExecutionIntelligenceCertificationFoundation
):
RiverDevExecutionIntelligenceCompletionFoundation {

const trusted =
certification.trusted === true &&
certification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-completion",

objective:
certification.objective,

trusted,

completionState:
trusted
?
[
"intelligence certification record accepted",
"intelligence completion created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence completion restricted",
"intelligence certification review required"
],

provenance:
trusted
?
[
"intelligence certification verified",
"completion provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence certification state preserved",
"completion boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence certification not trusted"
]

};

}

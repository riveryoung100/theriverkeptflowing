import type {
RiverDevExecutionIntelligenceMaturationFoundation,
RiverDevExecutionIntelligenceReadinessFoundation
} from "../types";

export function createExecutionIntelligenceReadiness(
maturation:
RiverDevExecutionIntelligenceMaturationFoundation
):
RiverDevExecutionIntelligenceReadinessFoundation {

const trusted =
maturation.trusted === true &&
maturation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-readiness",

objective:
maturation.objective,

trusted,

readinessState:
trusted
?
[
"intelligence maturation record accepted",
"intelligence readiness created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence readiness restricted",
"intelligence maturation review required"
],

provenance:
trusted
?
[
"intelligence maturation verified",
"readiness provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence maturation state preserved",
"readiness boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence maturation not trusted"
]

};

}

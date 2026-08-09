import type {
RiverDevExecutionIntelligenceOrchestrationFoundation,
RiverDevExecutionIntelligenceAdaptationFoundation
} from "../types";

export function createExecutionIntelligenceAdaptation(
orchestration:
RiverDevExecutionIntelligenceOrchestrationFoundation
):
RiverDevExecutionIntelligenceAdaptationFoundation {

const trusted =
orchestration.orchestrated === true &&
orchestration.authorized === true &&
orchestration.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-adaptation",

objective:
orchestration.objective,

trusted,

adaptationState:
trusted
?
[
"intelligence orchestration record accepted",
"intelligence adaptation created",
"controlled intelligence evolution preserved"
]
:
[
"intelligence adaptation restricted",
"intelligence orchestration review required"
],

provenance:
trusted
?
[
"intelligence orchestration verified",
"adaptation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence orchestration state preserved",
"adaptation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence orchestration not trusted"
]

};

}

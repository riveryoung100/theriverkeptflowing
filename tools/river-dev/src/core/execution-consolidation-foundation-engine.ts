import type {
RiverDevExecutionReinforcementFoundation,
RiverDevExecutionConsolidationFoundation
} from "../types";

export function createExecutionConsolidation(
reinforcement:
RiverDevExecutionReinforcementFoundation
):
RiverDevExecutionConsolidationFoundation {

const trusted =
reinforcement.trusted === true &&
reinforcement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-consolidation",

objective:
reinforcement.objective,

trusted,

consolidationState:
trusted
?
[
"reinforcement record accepted",
"execution consolidation created",
"controlled consolidation boundary preserved"
]
:
[
"consolidation generation restricted",
"reinforcement review required"
],

provenance:
trusted
?
[
"reinforcement record verified",
"consolidation provenance preserved",
"human authorization boundary maintained"
]
:
[
"reinforcement state preserved",
"consolidation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"reinforcement record not trusted"
]

};

}


import type {
RiverDevExecutionStabilizationFoundation,
RiverDevExecutionRecoveryFoundation
} from "../types";

export function createExecutionRecovery(
stabilization:
RiverDevExecutionStabilizationFoundation
):
RiverDevExecutionRecoveryFoundation {

const trusted =
stabilization.trusted === true &&
stabilization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-recovery",

objective:
stabilization.objective,

trusted,

recoveryState:
trusted
?
[
"stabilization record accepted",
"execution recovery created",
"controlled recovery boundary preserved"
]
:
[
"recovery generation restricted",
"stabilization review required"
],

provenance:
trusted
?
[
"stabilization record verified",
"recovery provenance preserved",
"human authorization boundary maintained"
]
:
[
"stabilization state preserved",
"recovery boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"stabilization record not trusted"
]

};

}

import type {
RiverDevExecutionRecoveryFoundation,
RiverDevExecutionRestorationFoundation
} from "../types";

export function createExecutionRestoration(
recovery:
RiverDevExecutionRecoveryFoundation
):
RiverDevExecutionRestorationFoundation {

const trusted =
recovery.trusted === true &&
recovery.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-restoration",

objective:
recovery.objective,

trusted,

restorationState:
trusted
?
[
"recovery record accepted",
"execution restoration created",
"controlled restoration boundary preserved"
]
:
[
"restoration generation restricted",
"recovery review required"
],

provenance:
trusted
?
[
"recovery record verified",
"restoration provenance preserved",
"human authorization boundary maintained"
]
:
[
"recovery state preserved",
"restoration boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"recovery record not trusted"
]

};

}


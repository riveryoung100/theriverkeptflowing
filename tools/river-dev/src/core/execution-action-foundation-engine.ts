import type {
RiverDevExecutionEnforcementFoundation,
RiverDevExecutionActionFoundation
} from "../types";

export function createExecutionAction(
enforcement:
RiverDevExecutionEnforcementFoundation
):
RiverDevExecutionActionFoundation {

const trusted =
enforcement.trusted === true &&
enforcement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-action",

objective:
enforcement.objective,

trusted,

actionState:
trusted
?
[
"enforcement record accepted",
"execution action created",
"controlled action boundary preserved"
]
:
[
"action generation restricted",
"enforcement review required"
],

provenance:
trusted
?
[
"enforcement record verified",
"action provenance preserved",
"human authorization boundary maintained"
]
:
[
"enforcement state preserved",
"action boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"enforcement record not trusted"
]

};

}

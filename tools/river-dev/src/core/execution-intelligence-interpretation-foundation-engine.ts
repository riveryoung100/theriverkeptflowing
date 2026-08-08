import type {
RiverDevExecutionIntelligenceUnderstandingFoundation,
RiverDevExecutionIntelligenceInterpretationFoundation
} from "../types";

export function createExecutionIntelligenceInterpretation(
understanding:
RiverDevExecutionIntelligenceUnderstandingFoundation
):
RiverDevExecutionIntelligenceInterpretationFoundation {

const interpreted =
understanding.understood === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-interpretation",

objective:
understanding.objective,

interpreted,

understood:
interpreted,

approved:
interpreted,

evaluation:
interpreted
?
[
"trusted understanding evaluated",
"interpretation approved"
]
:
[
"evaluation blocked"
],

interpretation:
interpreted
?
[
"trusted understanding state accepted",
"execution intelligence meaning interpreted",
"governed interpretation state prepared"
]
:
[
"interpretation generation blocked",
"untrusted understanding state recorded",
"review required before interpretation"
],

provenance:
interpreted
?
[
"understanding trust verified",
"interpretation provenance preserved",
"execution intelligence boundary maintained"
]
:
[
"untrusted understanding state recorded",
"interpretation boundary maintained"
],

blockedReasons:
interpreted
?
[]
:
[
"execution understanding not trusted"
]

};

}

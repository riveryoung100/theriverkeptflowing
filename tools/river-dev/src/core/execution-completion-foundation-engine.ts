import type {
RiverDevExecutionCertificationFoundation,
RiverDevExecutionCompletionFoundation
} from "../types";

export function createExecutionCompletion(
certification:
RiverDevExecutionCertificationFoundation
):
RiverDevExecutionCompletionFoundation {

const trusted =
certification.trusted === true &&
certification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-completion",

objective:
certification.objective,

trusted,

completionState:
trusted
?
[
"certification record accepted",
"execution completion created",
"controlled completion boundary preserved"
]
:
[
"completion generation restricted",
"certification review required"
],

provenance:
trusted
?
[
"certification record verified",
"completion provenance preserved",
"human authorization boundary maintained"
]
:
[
"certification state preserved",
"completion boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"certification record not trusted"
]

};

}

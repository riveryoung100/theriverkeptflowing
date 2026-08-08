import type {
RiverDevExecutionIntelligenceReasoningFoundation
} from "../types";

type RiverDevReasoningInput = {
readonly version:
"1.0.0";

readonly source:
string;

readonly objective:
string;

readonly approved:
boolean;

readonly understood:
boolean;

readonly evaluation:
readonly string[];

readonly provenance:
readonly string[];

readonly blockedReasons:
readonly string[];

readonly interpretation?:
readonly string[];
};

export function createExecutionIntelligenceReasoning(
input:
RiverDevReasoningInput
):
RiverDevExecutionIntelligenceReasoningFoundation {

const reasoned =
input.approved === true &&
input.understood === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
input.objective,

trusted:
reasoned,

reasoned,

approved:
reasoned,

reasoning:
reasoned
?
[
"trusted interpretation state accepted",
"execution intelligence relationships reasoned",
"governed reasoning state prepared"
]
:
[
"reasoning generation blocked",
"untrusted interpretation state recorded",
"review required before reasoning"
],

provenance:
reasoned
?
[
"interpretation trust verified",
"reasoning provenance preserved",
"execution intelligence boundary maintained"
]
:
[
"untrusted interpretation state recorded",
"reasoning boundary maintained"
],

blockedReasons:
reasoned
?
[]
:
[
"execution interpretation not trusted"
]

};

}

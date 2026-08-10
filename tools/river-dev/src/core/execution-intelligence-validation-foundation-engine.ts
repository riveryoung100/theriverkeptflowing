import type {
RiverDevExecutionIntelligenceVerificationFoundation,
RiverDevExecutionIntelligenceValidationFoundation
} from "../types";

export function createExecutionIntelligenceValidation(
verification:
RiverDevExecutionIntelligenceVerificationFoundation
):
RiverDevExecutionIntelligenceValidationFoundation {

const trusted =
verification.trusted === true &&
verification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-validation",

objective:
verification.objective,

trusted,

validationState:
trusted
?
[
"intelligence verification record accepted",
"intelligence validation created",
"controlled intelligence validation preserved"
]
:
[
"intelligence validation restricted",
"intelligence verification review required"
],

provenance:
trusted
?
[
"intelligence verification verified",
"validation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence verification state preserved",
"validation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence verification not trusted"
]

};

}

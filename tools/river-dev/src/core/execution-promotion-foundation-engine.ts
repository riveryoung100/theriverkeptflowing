import type {
RiverDevExecutionGovernanceFoundation,
RiverDevExecutionPromotionFoundation
} from "../types";

export function createExecutionPromotion(
governance:
RiverDevExecutionGovernanceFoundation
):
RiverDevExecutionPromotionFoundation {

const trusted =
governance.trusted === true &&
governance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-promotion",

objective:
governance.objective,

trusted,

promotionState:
trusted
?
[
"governance approval accepted",
"promotion record created",
"controlled adoption boundary preserved"
]
:
[
"promotion generation restricted",
"governance review required"
],

provenance:
trusted
?
[
"governance record verified",
"promotion provenance preserved",
"human authorization boundary maintained"
]
:
[
"governance state preserved",
"promotion boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"governance record not trusted"
]

};

}

import type {
RiverDevExecutionLifecycleIntelligenceTransition,
RiverDevExecutionLifecycleIntelligenceConsolidation
} from "../types";

export function createLifecycleIntelligenceTransition(
consolidation:
RiverDevExecutionLifecycleIntelligenceConsolidation
):
RiverDevExecutionLifecycleIntelligenceTransition {

const blocked =
consolidation.trusted === false ||
consolidation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
consolidation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-consolidation",

transition:
consolidation.consolidation.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "transitioned",

reason:
step.reason

})
),

blockedReasons:
consolidation.blockedReasons

};

}

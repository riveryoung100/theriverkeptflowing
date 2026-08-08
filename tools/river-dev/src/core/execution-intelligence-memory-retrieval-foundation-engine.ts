import type {
RiverDevExecutionIntelligenceMemoryFoundation,
RiverDevExecutionIntelligenceMemoryRetrievalFoundation
} from "../types";

export function createExecutionIntelligenceMemoryRetrieval(
memory:
RiverDevExecutionIntelligenceMemoryFoundation
):
RiverDevExecutionIntelligenceMemoryRetrievalFoundation {

const retrieved =
memory.trusted === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory-retrieval",

objective:
memory.objective,

retrieved,

memory:
retrieved
?
[
"trusted execution intelligence memory retrieved",
"validated execution knowledge restored",
"controlled memory reuse prepared"
]
:
[
"memory retrieval blocked",
"untrusted memory state recorded",
"review required before reuse"
],

provenance:
retrieved
?
[
"memory trust verified",
"retrieval provenance preserved",
"execution history boundary maintained"
]
:
[
"untrusted memory state recorded",
"retrieval boundary maintained"
],

blockedReasons:
retrieved
?
[]
:
[
"execution memory not trusted"
]

};

}

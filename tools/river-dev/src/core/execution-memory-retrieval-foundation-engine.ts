import type {
RiverDevExecutionMemory,
RiverDevExecutionMemoryRetrieval
} from "../types";

export function createExecutionMemoryRetrieval(
memory:
RiverDevExecutionMemory
):
RiverDevExecutionMemoryRetrieval {

const trusted =
memory.trusted === true;

return {

version:
"1.0.0",

objective:
memory.objective,

trusted,

retrievedEntries:
trusted
?
memory.entries
:
[],

provenance:
trusted
?
[
"execution memory validated",
"historical execution context retrieved",
"memory provenance preserved"
]
:
[
"execution memory blocked",
"retrieval halted",
"authorization review required"
],

blockedReasons:
trusted
?
[]
:
[
"execution memory not trusted"
]

};

}

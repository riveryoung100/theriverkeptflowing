import type {
RiverDevExecutionKnowledge,
RiverDevKnowledgeObject,
RiverDevExecutionMemory
} from "../types";

export function createExecutionKnowledge(
memory:
RiverDevExecutionMemory
):
RiverDevExecutionKnowledge {

const objects =
memory.entries.map(
(entry):
RiverDevKnowledgeObject =>
({

category:
entry.category,

key:
entry.key,

insight:
entry.value,

source:
entry.source

})
);

const blockedReasons =
memory.entries
.filter(
(entry) =>
entry.value === "do not proceed"
)
.map(
(entry) =>
entry.value
);

return {

version:
"1.0.0",

objective:
memory.objective,

trusted:
memory.trusted &&
blockedReasons.length === 0,

objects,

blockedReasons

};

}

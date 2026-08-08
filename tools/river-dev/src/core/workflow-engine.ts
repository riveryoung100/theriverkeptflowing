import type {
RiverDevExecutionWorkflow,
RiverDevWorkflow,
RiverDevExecutionSkillComposition
} from "../types";

export function createExecutionWorkflow(
composition:
RiverDevExecutionSkillComposition
):
RiverDevExecutionWorkflow {

const workflows =
composition.compositions.map(
(item):
RiverDevWorkflow =>
({

category:
item.category,

name:
item.name,

description:
item.description,

source:
item.source,

steps:
[
item.name
]

})
);

const blockedReasons =
composition.compositions
.filter(
(item) =>
item.description === "do not proceed"
)
.map(
(item) =>
item.description
);

return {

version:
"1.0.0",

objective:
composition.objective,

trusted:
composition.trusted &&
blockedReasons.length === 0,

ready:
composition.trusted &&
blockedReasons.length === 0,

steps:
[],

workflows,

blockedReasons

};

}


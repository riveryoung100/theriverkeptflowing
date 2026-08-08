import type {
RiverDevExecutionSkill,
RiverDevSkill,
RiverDevExecutionCapability
} from "../types";

export function createExecutionSkill(
capability:
RiverDevExecutionCapability
):
RiverDevExecutionSkill {

const skills =
capability.capabilities.map(
(item):
RiverDevSkill =>
({

category:
item.category,

name:
item.name,

description:
item.description,

source:
item.source

})
);

const blockedReasons =
capability.capabilities
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
capability.objective,

trusted:
capability.trusted &&
blockedReasons.length === 0,

skills,

blockedReasons

};

}

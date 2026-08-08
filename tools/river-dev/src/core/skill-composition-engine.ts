import type {
RiverDevExecutionSkillComposition,
RiverDevSkillComposition,
RiverDevExecutionSkill
} from "../types";

export function createExecutionSkillComposition(
skill:
RiverDevExecutionSkill
):
RiverDevExecutionSkillComposition {

const compositions =
skill.skills.map(
(item):
RiverDevSkillComposition =>
({

category:
item.category,

name:
item.name,

description:
item.description,

source:
item.source,

skills:
[
item.name
]

})
);

const blockedReasons =
skill.skills
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
skill.objective,

trusted:
skill.trusted &&
blockedReasons.length === 0,

compositions,

blockedReasons

};

}

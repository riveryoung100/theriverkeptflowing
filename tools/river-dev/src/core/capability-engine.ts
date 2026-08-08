import type {
RiverDevExecutionCapability,
RiverDevCapability,
RiverDevExecutionKnowledge
} from "../types";

export function createExecutionCapability(
knowledge:
RiverDevExecutionKnowledge
):
RiverDevExecutionCapability {

const capabilities =
knowledge.objects.map(
(object):
RiverDevCapability =>
({

category:
object.category,

name:
object.key,

description:
object.insight,

source:
object.source

})
);

const blockedReasons =
knowledge.objects
.filter(
(object) =>
object.insight === "do not proceed"
)
.map(
(object) =>
object.insight
);

return {

version:
"1.0.0",

objective:
knowledge.objective,

trusted:
knowledge.trusted &&
blockedReasons.length === 0,

capabilities,

blockedReasons

};

}

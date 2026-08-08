import type {
RiverDevPlanningIntelligence,
RiverDevProjectIntelligence
} from "../types";


export function createPlanningIntelligence(
project:
RiverDevProjectIntelligence,
objective:
string
):
RiverDevPlanningIntelligence {


const trusted =
project.understood === true;


return {

version:
"1.0.0",

source:
"river-development-agent-planning-intelligence",

objective,

projectRepository:
project.repository,

steps:
[
"inspect project intelligence",
"validate approved objective",
"generate deterministic implementation plan",
"preserve authorization boundaries"
],

risks:
[
"scope expansion",
"unapproved modification",
"missing validation"
],

trusted

};

}

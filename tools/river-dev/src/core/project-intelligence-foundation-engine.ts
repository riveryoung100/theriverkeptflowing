import type {
RiverDevProjectIntelligence
} from "../types";

export function createProjectIntelligence(
repository:
string,
architecture:
string[],
contentSystems:
string[]
):
RiverDevProjectIntelligence {

return {

version:
"1.0.0",

source:
"river-development-agent-project-intelligence",

repository,

architecture,

contentSystems,

understood:
true

};

}

import test from "node:test";
import assert from "node:assert/strict";

import {
createPlanningIntelligence
} from "./planning-intelligence-foundation-engine";


test(
"creates trusted planning intelligence from understood project intelligence",
() => {

const planning =
createPlanningIntelligence(
{
version:
"1.0.0",

source:
"project-intelligence-test",

repository:
"RIVERKEPTFLOWING",

architecture:
[
"River Development Agent"
],

contentSystems:
[
"Videos",
"Guides"
],

understood:
true
},
"Build next development capability"
);


assert.equal(
planning.trusted,
true
);


assert.equal(
planning.projectRepository,
"RIVERKEPTFLOWING"
);


assert.equal(
planning.steps[0],
"inspect project intelligence"
);

}
);


test(
"blocks trusted planning when project intelligence is not understood",
() => {

const planning =
createPlanningIntelligence(
{
version:
"1.0.0",

source:
"project-intelligence-test",

repository:
"unknown",

architecture:
[],

contentSystems:
[],

understood:
false
},
"Unsafe objective"
);


assert.equal(
planning.trusted,
false
);

}
);


test(
"preserves planning provenance",
() => {

const planning =
createPlanningIntelligence(
{
version:
"1.0.0",

source:
"project-intelligence-test",

repository:
"repository",

architecture:
[],

contentSystems:
[],

understood:
true
},
"provenance test"
);


assert.equal(
planning.source,
"river-development-agent-planning-intelligence"
);

}
);

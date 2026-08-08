import test from "node:test";
import assert from "node:assert/strict";

import {
createProjectIntelligence
} from "./project-intelligence-foundation-engine";


test(
"creates understood project intelligence",
() => {

const intelligence =
createProjectIntelligence(
"RIVERKEPTFLOWING",
[
"River Development Agent",
"Astro Website",
"Content Engine"
],
[
"Videos",
"Guides",
"Articles"
]
);


assert.equal(
intelligence.understood,
true
);


assert.equal(
intelligence.repository,
"RIVERKEPTFLOWING"
);


assert.equal(
intelligence.architecture[0],
"River Development Agent"
);


}
);


test(
"preserves project intelligence provenance",
() => {

const intelligence =
createProjectIntelligence(
"test-repository",
[],
[]
);


assert.equal(
intelligence.source,
"river-development-agent-project-intelligence"
);


}
);


test(
"creates deterministic project intelligence",
() => {

const first =
createProjectIntelligence(
"same-repository",
[
"system"
],
[
"content"
]
);


const second =
createProjectIntelligence(
"same-repository",
[
"system"
],
[
"content"
]
);


assert.deepEqual(
first,
second
);


}
);

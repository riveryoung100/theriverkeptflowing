import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionWorkflowOrchestration
} from "./workflow-orchestration-engine";

test(
"creates trusted orchestrations from trusted workflows",
() => {

const orchestration =
createExecutionWorkflowOrchestration(
{
version:
"1.0.0",

objective:
"Orchestration test",

trusted:
true,

ready:
true,

steps:
[],

workflows: [

{
category:
"architecture",

name:
"boundary",

description:
"preserve existing boundary",

source:
"controlled-execution-workflow",

steps:
[
"boundary"
]

}

],

blockedReasons:
[]

}
);

assert.equal(
orchestration.version,
"1.0.0"
);

assert.equal(
orchestration.orchestrations[0]!.name,
"boundary"
);

assert.equal(
orchestration.orchestrations[0]!.workflows[0],
"boundary"
);

assert.equal(
orchestration.trusted,
true
);

}
);

test(
"blocks orchestrations from untrusted workflows",
() => {

const orchestration =
createExecutionWorkflowOrchestration(
{
version:
"1.0.0",

objective:
"Blocked orchestration test",

trusted:
false,

ready:
false,

steps:
[],

workflows: [

{
category:
"execution",

name:
"decision",

description:
"do not proceed",

source:
"controlled-execution-workflow",

steps:
[
"decision"
]

}

],

blockedReasons:
[
"do not proceed"
]

}
);

assert.equal(
orchestration.trusted,
false
);

assert.equal(
orchestration.blockedReasons.length,
1
);

}
);

test(
"preserves workflow provenance in orchestrations",
() => {

const orchestration =
createExecutionWorkflowOrchestration(
{
version:
"1.0.0",

objective:
"Source orchestration test",

trusted:
true,

ready:
true,

steps:
[],

workflows: [

{
category:
"reasoning",

name:
"approval",

description:
"await approval",

source:
"controlled-execution-reasoning",

steps:
[
"approval"
]

}

],

blockedReasons:
[]

}
);

assert.equal(
orchestration.orchestrations[0]!.source,
"controlled-execution-reasoning"
);

}
);

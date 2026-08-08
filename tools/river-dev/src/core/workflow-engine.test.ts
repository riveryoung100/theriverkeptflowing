import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionWorkflow
} from "./workflow-engine";

test(
"creates trusted workflows from trusted compositions",
() => {

const workflow =
createExecutionWorkflow(
{
version:
"1.0.0",

objective:
"Workflow test",

trusted:
true,

compositions: [

{
category:
"architecture",

name:
"boundary",

description:
"preserve existing boundary",

source:
"controlled-execution-skill-composition",

skills:
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
workflow.version,
"1.0.0"
);

assert.equal(
workflow.workflows![0]!.name,
"boundary"
);

assert.equal(
workflow.workflows![0]!.steps[0],
"boundary"
);

assert.equal(
workflow.trusted,
true
);

}
);


test(
"blocks workflows from untrusted compositions",
() => {

const workflow =
createExecutionWorkflow(
{
version:
"1.0.0",

objective:
"Blocked workflow test",

trusted:
false,

compositions: [

{
category:
"execution",

name:
"decision",

description:
"do not proceed",

source:
"controlled-execution-skill-composition",

skills:
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
workflow.trusted,
false
);

assert.equal(
workflow.blockedReasons.length,
1
);

}
);


test(
"preserves composition provenance in workflows",
() => {

const workflow =
createExecutionWorkflow(
{
version:
"1.0.0",

objective:
"Source workflow test",

trusted:
true,

compositions: [

{
category:
"reasoning",

name:
"approval",

description:
"await approval",

source:
"controlled-execution-reasoning",

skills:
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
workflow.workflows![0]!.source,
"controlled-execution-reasoning"
);

}
);

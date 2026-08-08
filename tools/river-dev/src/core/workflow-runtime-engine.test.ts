import assert from "node:assert/strict";
import test from "node:test";

import {
createWorkflowRuntime
} from "./workflow-runtime-engine";

test(
"creates ready runtime from trusted orchestration",
() => {

const runtime =
createWorkflowRuntime(
{
version:
"1.0.0",

objective:
"Runtime test",

trusted:
true,

orchestrations: [

{
category:
"architecture",

name:
"boundary",

description:
"preserve boundary",

source:
"controlled-execution-workflow",

workflows:
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
runtime.version,
"1.0.0"
);

assert.equal(
runtime.steps[0]!.name,
"boundary"
);

assert.equal(
runtime.steps[0]!.status,
"ready"
);

assert.equal(
runtime.trusted,
true
);

}
);

test(
"blocks runtime from blocked orchestration",
() => {

const runtime =
createWorkflowRuntime(
{
version:
"1.0.0",

objective:
"Blocked runtime test",

trusted:
false,

orchestrations: [

{
category:
"execution",

name:
"decision",

description:
"do not proceed",

source:
"controlled-execution-workflow",

workflows:
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
runtime.trusted,
false
);

assert.equal(
runtime.steps[0]!.status,
"blocked"
);

assert.equal(
runtime.blockedReasons.length,
1
);

}
);

test(
"preserves orchestration provenance in runtime",
() => {

const runtime =
createWorkflowRuntime(
{
version:
"1.0.0",

objective:
"Source runtime test",

trusted:
true,

orchestrations: [

{
category:
"reasoning",

name:
"approval",

description:
"await approval",

source:
"controlled-execution-reasoning",

workflows:
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
runtime.steps[0]!.source,
"controlled-execution-reasoning"
);

}
);

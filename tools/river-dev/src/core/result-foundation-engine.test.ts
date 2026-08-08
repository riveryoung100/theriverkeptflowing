import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionResult
} from "./result-foundation-engine";


test(
"creates successful results from trusted runtime",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Result test",

trusted:
true,

steps:
[
{
name:
"boundary",

source:
"controlled-execution-workflow",

status:
"ready"
}
],

blockedReasons:
[]

}
);


assert.equal(
result.version,
"1.0.0"
);

assert.equal(
result.ready,
true
);

assert.equal(
result.status,
"success"
);

assert.equal(
result.results[0]!.taskId,
"boundary"
);

assert.equal(
result.trusted,
true
);

}
);


test(
"blocks results from blocked runtime",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Blocked result test",

trusted:
false,

steps:
[
{
name:
"decision",

source:
"controlled-execution-workflow",

status:
"blocked"
}
],

blockedReasons:
[
"do not proceed"
]

}
);


assert.equal(
result.ready,
false
);

assert.equal(
result.status,
"blocked"
);

assert.equal(
result.trusted,
false
);

assert.equal(
result.blockedReasons.length,
1
);

}
);


test(
"preserves runtime provenance in results",
() => {

const result =
createExecutionResult(
{
version:
"1.0.0",

objective:
"Source result test",

trusted:
true,

steps:
[
{
name:
"approval",

source:
"controlled-execution-reasoning",

status:
"ready"
}
],

blockedReasons:
[]

}
);


assert.equal(
result.source,
"controlled-execution-workflow-runtime"
);

assert.equal(
result.details![0],
"approval:ready"
);

}
);


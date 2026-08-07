import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionMemory
} from "./memory-engine";

test(
"creates trusted memory from validated reasoning",
() => {

const memory =
createExecutionMemory(
{
version:
"1.0.0",

objective:
"Memory test",

validated:
true,

steps: [

{
category:
"architecture",

state:
"reasoned",

explanation:
"architecture decision approved",

decision:
"preserve existing boundary"
}

],

blockedReasons:
[]

}
);

assert.equal(
memory.version,
"1.0.0"
);

assert.equal(
memory.entries[0]!.category,
"architecture"
);

assert.equal(
memory.trusted,
true
);

}
);


test(
"blocks trusted memory from blocked reasoning",
() => {

const memory =
createExecutionMemory(
{
version:
"1.0.0",

objective:
"Blocked memory test",

validated:
false,

steps: [

{
category:
"execution",

state:
"blocked",

explanation:
"execution blocked",

decision:
"do not proceed"
}

],

blockedReasons:
[
"execution blocked"
]

}
);

assert.equal(
memory.trusted,
false
);

assert.equal(
memory.blockedReasons.length,
1
);

assert.equal(
memory.entries[0]!.value,
"do not proceed"
);

}
);


test(
"requires preserved gate state for confirmation reasoning",
() => {

const memory =
createExecutionMemory(
{
version:
"1.0.0",

objective:
"Confirmation memory test",

validated:
false,

steps: [

{
category:
"approval",

state:
"confirmation-required",

explanation:
"human approval required",

decision:
"await confirmation"
}

],

blockedReasons:
[]

}
);

assert.equal(
memory.trusted,
false
);

assert.equal(
memory.entries[0]!.source,
"controlled-execution-reasoning"
);

}
);

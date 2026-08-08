import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionCapability
} from "./capability-engine";

test(
"creates trusted capabilities from trusted knowledge",
() => {

const capability =
createExecutionCapability(
{
version:
"1.0.0",

objective:
"Capability test",

trusted:
true,

objects: [

{
category:
"architecture",

key:
"boundary",

insight:
"preserve existing boundary",

source:
"controlled-execution-knowledge"
}

],

blockedReasons:
[]

}
);

assert.equal(
capability.version,
"1.0.0"
);

assert.equal(
capability.capabilities[0]!.name,
"boundary"
);

assert.equal(
capability.trusted,
true
);

}
);


test(
"blocks trusted capabilities from untrusted knowledge",
() => {

const capability =
createExecutionCapability(
{
version:
"1.0.0",

objective:
"Blocked capability test",

trusted:
false,

objects: [

{
category:
"execution",

key:
"decision",

insight:
"do not proceed",

source:
"controlled-execution-knowledge"
}

],

blockedReasons:
[
"do not proceed"
]

}
);

assert.equal(
capability.trusted,
false
);

assert.equal(
capability.blockedReasons.length,
1
);

}
);


test(
"preserves knowledge provenance in capabilities",
() => {

const capability =
createExecutionCapability(
{
version:
"1.0.0",

objective:
"Source capability test",

trusted:
true,

objects: [

{
category:
"reasoning",

key:
"approval",

insight:
"await approval",

source:
"controlled-execution-reasoning"
}

],

blockedReasons:
[]

}
);

assert.equal(
capability.capabilities[0]!.source,
"controlled-execution-reasoning"
);

}
);

import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionIntelligence
} from "./intelligence-engine";


test(
"creates understood intelligence from executable orchestrator",
() => {

const intelligence =
createExecutionIntelligence(
{
version:
"1.0.0",

objective:
"Intelligence test",

executable:
true,

steps: [

{
name:
"implementation",

state:
"complete",

reason:
"execution approved"

}

],

blockedReasons:
[]

}
);


assert.equal(
intelligence.version,
"1.0.0"
);

assert.equal(
intelligence.steps[0]!.state,
"understood"
);

assert.equal(
intelligence.understood,
true
);

}
);


test(
"blocks intelligence from blocked orchestrator",
() => {

const intelligence =
createExecutionIntelligence(
{
version:
"1.0.0",

objective:
"Blocked intelligence test",

executable:
false,

steps: [

{
name:
"implementation",

state:
"blocked",

reason:
"execution blocked"

}

],

blockedReasons:
[
"execution blocked"
]

}
);


assert.equal(
intelligence.understood,
false
);

assert.equal(
intelligence.steps[0]!.state,
"blocked"
);

assert.equal(
intelligence.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated orchestrator",
() => {

const intelligence =
createExecutionIntelligence(
{
version:
"1.0.0",

objective:
"Confirmation intelligence test",

executable:
false,

steps: [

{
name:
"approval",

state:
"confirmation-required",

reason:
"awaiting approval"

}

],

blockedReasons:
[]

}
);


assert.equal(
intelligence.understood,
false
);

assert.equal(
intelligence.steps[0]!.state,
"confirmation-required"
);

}
);

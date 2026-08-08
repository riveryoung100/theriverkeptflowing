import test from "node:test";
import assert from "node:assert/strict";

import {
createLifecycleIntelligenceIntegration
} from "./lifecycle-intelligence-resilience-integration-foundation-engine";


test(
"creates trusted integration from trusted resilience",
() => {

const integration =
createLifecycleIntelligenceIntegration({

version:
"1.0.0",

objective:
"test integration",

trusted:
true,

source:
"test-resilience",

resilience:
[
{
taskId:
"task-001",

state:
"resilient",

reason:
"healthy capability"
}
],

blockedReasons:
[]

});


assert.equal(
integration.trusted,
true
);

assert.equal(
integration.integration[0]!.taskId,
"task-001"
);

assert.equal(
integration.integration[0]!.state,
"integrated"
);

}
);


test(
"blocks integration from blocked resilience",
() => {

const integration =
createLifecycleIntelligenceIntegration({

version:
"1.0.0",

objective:
"blocked integration",

trusted:
false,

source:
"test-resilience",

resilience:
[
{
taskId:
"task-002",

state:
"blocked",

reason:
"blocked dependency"
}
],

blockedReasons:
[
"blocked dependency"
]

});


assert.equal(
integration.trusted,
false
);

assert.equal(
integration.integration[0]!.state,
"blocked"
);

}
);


test(
"preserves resilience provenance in integration",
() => {

const integration =
createLifecycleIntelligenceIntegration({

version:
"1.0.0",

objective:
"provenance test",

trusted:
true,

source:
"resilience-foundation",

resilience:
[
{
taskId:
"task-003",

state:
"resilient",

reason:
"verified"
}
],

blockedReasons:
[]

});


assert.equal(
integration.source,
"controlled-execution-lifecycle-intelligence-resilience"
);

assert.equal(
integration.integration[0]!.reason,
"verified"
);

}
);

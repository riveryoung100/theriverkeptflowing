import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionLifecycle
} from "./execution-lifecycle-foundation-engine";


test(
"creates ready lifecycle from approved execution intelligence",
() => {

const lifecycle =
createExecutionLifecycle({

version:
"1.0.0",

source:
"execution-intelligence-test",

objective:
"Build capability",

preparationSource:
"river-development-agent-execution-preparation",

decision:
"approved",

executionActions:
[
"execute approved implementation"
],

validationRequirements:
[
"verify authorization"
],

understood:
true,

steps:
[],

blockedReasons:
[]

});


assert.equal(
lifecycle.state,
"ready"
);

assert.equal(
lifecycle.active,
true
);

assert.equal(
lifecycle.objective,
"Build capability"
);

assert.equal(
lifecycle.lifecycleSteps?.[0],
"validate execution decision"
);

}
);


test(
"blocks lifecycle from blocked execution intelligence",
() => {

const lifecycle =
createExecutionLifecycle({

version:
"1.0.0",

source:
"execution-intelligence-test",

objective:
"Unsafe capability",

preparationSource:
"river-development-agent-execution-preparation",

decision:
"blocked",

executionActions:
[
"halt execution"
],

validationRequirements:
[],

understood:
false,

steps:
[],

blockedReasons:
[
"authorization missing"
]

});


assert.equal(
lifecycle.state,
"blocked"
);

assert.equal(
lifecycle.active,
false
);

assert.equal(
lifecycle.blockedReasons[0],
"execution decision not approved"
);

}
);


test(
"preserves lifecycle provenance",
() => {

const lifecycle =
createExecutionLifecycle({

version:
"1.0.0",

source:
"execution-intelligence-test",

objective:
"Provenance test",

preparationSource:
"river-development-agent-execution-preparation",

decision:
"approved",

executionActions:
[],

validationRequirements:
[],

understood:
true,

steps:
[],

blockedReasons:
[]

});


assert.equal(
lifecycle.source,
"river-development-agent-execution-lifecycle"
);

assert.equal(
lifecycle.executionSource,
"river-development-agent-execution-intelligence"
);

}
);

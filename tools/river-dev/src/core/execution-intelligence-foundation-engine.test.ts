import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligence
} from "./execution-intelligence-foundation-engine";


test(
"creates approved execution intelligence from authorized preparation",
() => {

const intelligence =
createExecutionIntelligence({

version:
"1.0.0",

source:
"execution-preparation-test",

objective:
"Build capability",

implementationSource:
"river-development-agent-implementation-intelligence",

executionSteps:
[
"prepare execution"
],

safetyChecks:
[
"verify authorization"
],

authorized:
true

});


assert.equal(
intelligence.decision,
"approved"
);

assert.equal(
intelligence.understood,
true
);

assert.equal(
intelligence.objective,
"Build capability"
);

assert.equal(
intelligence.executionActions?.[0],
"execute approved implementation"
);

}
);


test(
"blocks execution intelligence from unauthorized preparation",
() => {

const intelligence =
createExecutionIntelligence({

version:
"1.0.0",

source:
"execution-preparation-test",

objective:
"Unsafe capability",

implementationSource:
"river-development-agent-implementation-intelligence",

executionSteps:
[],

safetyChecks:
[],

authorized:
false

});


assert.equal(
intelligence.decision,
"blocked"
);

assert.equal(
intelligence.understood,
false
);

assert.equal(
intelligence.blockedReasons[0],
"execution authorization missing"
);

}
);


test(
"preserves execution intelligence provenance",
() => {

const intelligence =
createExecutionIntelligence({

version:
"1.0.0",

source:
"execution-preparation-test",

objective:
"Provenance test",

implementationSource:
"river-development-agent-implementation-intelligence",

executionSteps:
[],

safetyChecks:
[],

authorized:
true

});


assert.equal(
intelligence.source,
"river-development-agent-execution-intelligence"
);


assert.equal(
intelligence.preparationSource,
"river-development-agent-execution-preparation"
);

}
);

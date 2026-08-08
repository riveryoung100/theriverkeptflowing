import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionMemory
} from "./execution-memory-foundation-engine";

test(
"creates trusted execution memory from active continuation",
() => {

const memory =
createExecutionMemory({

version:
"1.0.0",

source:
"execution-continuation-test",

objective:
"Build capability",

reportingSource:
"river-development-agent-execution-reporting",

continuationState:
"continue",

continuationActions:
[
"continue governed execution flow"
],

validationSummary:
[
"verify authorization"
],

authorized:
true

});

assert.equal(
memory.trusted,
true
);

assert.equal(
memory.objective,
"Build capability"
);

assert.equal(
memory.entries[0]!.value,
"execution continuation accepted"
);

assert.equal(
memory.blockedReasons.length,
0
);

}
);


test(
"creates blocked memory from halted continuation",
() => {

const memory =
createExecutionMemory({

version:
"1.0.0",

source:
"execution-continuation-test",

objective:
"Unsafe capability",

reportingSource:
"river-development-agent-execution-reporting",

continuationState:
"halt",

continuationActions:
[
"halt continuation flow"
],

validationSummary:
[],

authorized:
false

});

assert.equal(
memory.trusted,
false
);

assert.equal(
memory.entries[0]!.value,
"execution continuation halted"
);

assert.equal(
memory.blockedReasons[0],
"execution continuation not authorized"
);

}
);


test(
"preserves execution memory provenance",
() => {

const memory =
createExecutionMemory({

version:
"1.0.0",

source:
"execution-continuation-test",

objective:
"Provenance test",

reportingSource:
"river-development-agent-execution-reporting",

continuationState:
"continue",

continuationActions:
[],

validationSummary:
[],

authorized:
true

});

assert.equal(
memory.version,
"1.0.0"
);

assert.equal(
memory.entries[0]!.source,
"river-development-agent-execution-continuation"
);

}
);


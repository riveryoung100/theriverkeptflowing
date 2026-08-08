import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceMemory
} from "./execution-intelligence-memory-foundation-engine";

test(
"creates trusted memory from continuing execution state",
() => {

const memory =
createExecutionIntelligenceMemory({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-continuation",

objective:
"Build capability",

continuing:
true,

continuation:
[
"successful execution outcome accepted"
],

provenance:
[
"continuation trust verified"
],

blockedReasons:
[]

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
memory.memory[0],
"successful continuation state recorded"
);

assert.equal(
memory.blockedReasons.length,
0
);

}
);


test(
"blocks memory from failed continuation state",
() => {

const memory =
createExecutionIntelligenceMemory({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-continuation",

objective:
"Unsafe capability",

continuing:
false,

continuation:
[
"continuation halted"
],

provenance:
[
"blocked continuation state recorded"
],

blockedReasons:
[
"execution continuation failed"
]

});

assert.equal(
memory.trusted,
false
);

assert.equal(
memory.blockedReasons[0],
"execution continuation not trusted"
);

}
);


test(
"preserves memory provenance",
() => {

const memory =
createExecutionIntelligenceMemory({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-continuation",

objective:
"Provenance test",

continuing:
true,

continuation:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
memory.source,
"river-development-agent-execution-intelligence-memory"
);

assert.equal(
memory.provenance[0],
"continuation trust verified"
);

assert.equal(
memory.version,
"1.0.0"
);

}
);

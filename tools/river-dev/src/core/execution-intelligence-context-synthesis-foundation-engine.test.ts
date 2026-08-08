import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceContextSynthesis
} from "./execution-intelligence-context-synthesis-foundation-engine";

test(
"creates synthesized context from trusted retrieval",
() => {

const context =
createExecutionIntelligenceContextSynthesis({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory-retrieval",

objective:
"Build capability",

retrieved:
true,

memory:
[
"trusted execution intelligence memory retrieved"
],

provenance:
[
"retrieval trust verified"
],

blockedReasons:
[]

});

assert.equal(
context.synthesized,
true
);

assert.equal(
context.objective,
"Build capability"
);

assert.equal(
context.context[0],
"trusted memory retrieval accepted"
);

assert.equal(
context.blockedReasons.length,
0
);

}
);

test(
"blocks synthesis from untrusted retrieval",
() => {

const context =
createExecutionIntelligenceContextSynthesis({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory-retrieval",

objective:
"Unsafe capability",

retrieved:
false,

memory:
[
"memory retrieval blocked"
],

provenance:
[
"untrusted retrieval state recorded"
],

blockedReasons:
[
"execution memory not trusted"
]

});

assert.equal(
context.synthesized,
false
);

assert.equal(
context.blockedReasons[0],
"execution memory retrieval not trusted"
);

}
);

test(
"preserves context synthesis provenance",
() => {

const context =
createExecutionIntelligenceContextSynthesis({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory-retrieval",

objective:
"Provenance test",

retrieved:
true,

memory:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
context.source,
"river-development-agent-execution-intelligence-context-synthesis"
);

assert.equal(
context.provenance[0],
"retrieval trust verified"
);

assert.equal(
context.version,
"1.0.0"
);

}
);

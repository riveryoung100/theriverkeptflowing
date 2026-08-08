import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceMemoryRetrieval
} from "./execution-intelligence-memory-retrieval-foundation-engine";

test(
"retrieves trusted execution intelligence memory",
() => {

const retrieval =
createExecutionIntelligenceMemoryRetrieval({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory",

objective:
"Build capability",

trusted:
true,

memory:
[
"validated execution intelligence preserved"
],

provenance:
[
"memory trust verified"
],

blockedReasons:
[]

});

assert.equal(
retrieval.retrieved,
true
);

assert.equal(
retrieval.objective,
"Build capability"
);

assert.equal(
retrieval.memory[0],
"trusted execution intelligence memory retrieved"
);

assert.equal(
retrieval.blockedReasons.length,
0
);

}
);

test(
"blocks retrieval from untrusted memory",
() => {

const retrieval =
createExecutionIntelligenceMemoryRetrieval({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory",

objective:
"Unsafe capability",

trusted:
false,

memory:
[
"memory generation halted"
],

provenance:
[
"blocked memory state recorded"
],

blockedReasons:
[
"execution memory not trusted"
]

});

assert.equal(
retrieval.retrieved,
false
);

assert.equal(
retrieval.blockedReasons[0],
"execution memory not trusted"
);

}
);

test(
"preserves retrieval provenance",
() => {

const retrieval =
createExecutionIntelligenceMemoryRetrieval({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-memory",

objective:
"Provenance test",

trusted:
true,

memory:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
retrieval.source,
"river-development-agent-execution-intelligence-memory-retrieval"
);

assert.equal(
retrieval.provenance[0],
"memory trust verified"
);

assert.equal(
retrieval.version,
"1.0.0"
);

}
);

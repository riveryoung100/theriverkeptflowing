import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceUnderstanding
} from "./execution-intelligence-understanding-foundation-engine";

test(
"creates understanding from trusted synthesized context",
() => {

const understanding =
createExecutionIntelligenceUnderstanding({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-context-synthesis",

objective:
"Build capability",

synthesized:
true,

context:
[
"execution intelligence context synthesized"
],

provenance:
[
"context synthesis trust verified"
],

blockedReasons:
[]

});

assert.equal(
understanding.understood,
true
);

assert.equal(
understanding.objective,
"Build capability"
);

assert.equal(
understanding.understanding[0],
"trusted synthesized context accepted"
);

assert.equal(
understanding.blockedReasons.length,
0
);

}
);

test(
"blocks understanding from untrusted synthesized context",
() => {

const understanding =
createExecutionIntelligenceUnderstanding({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-context-synthesis",

objective:
"Unsafe capability",

synthesized:
false,

context:
[
"context synthesis blocked"
],

provenance:
[
"untrusted context state recorded"
],

blockedReasons:
[
"execution context synthesis failed"
]

});

assert.equal(
understanding.understood,
false
);

assert.equal(
understanding.blockedReasons[0],
"execution context synthesis not trusted"
);

}
);

test(
"preserves understanding provenance",
() => {

const understanding =
createExecutionIntelligenceUnderstanding({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-context-synthesis",

objective:
"Provenance test",

synthesized:
true,

context:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
understanding.source,
"river-development-agent-execution-intelligence-understanding"
);

assert.equal(
understanding.provenance[0],
"context synthesis trust verified"
);

assert.equal(
understanding.version,
"1.0.0"
);

}
);

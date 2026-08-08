import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionContextSynthesis
} from "./execution-context-synthesis-foundation-engine";

test(
"creates trusted synthesized context from trusted retrieval",
() => {

const synthesis =
createExecutionContextSynthesis({

version:
"1.0.0",

objective:
"Build capability",

trusted:
true,

retrievedEntries:
[
{
category:
"execution",

key:
"state",

value:
"completed",

source:
"river-development-agent-execution-memory"
}
],

provenance:
[
"execution memory retrieval verified"
],

blockedReasons:
[]

});

assert.equal(
synthesis.trusted,
true
);

assert.equal(
synthesis.objective,
"Build capability"
);

assert.equal(
synthesis.retrievedContext.length,
1
);

assert.equal(
synthesis.retrievedContext[0]!.value,
"completed"
);

}
);

test(
"blocks synthesis from untrusted retrieval",
() => {

const synthesis =
createExecutionContextSynthesis({

version:
"1.0.0",

objective:
"Unsafe capability",

trusted:
false,

retrievedEntries:
[
{
category:
"execution",

key:
"state",

value:
"blocked",

source:
"river-development-agent-execution-memory"
}
],

provenance:
[],

blockedReasons:
[
"execution memory retrieval failed"
]

});

assert.equal(
synthesis.trusted,
false
);

assert.equal(
synthesis.retrievedContext.length,
0
);

assert.equal(
synthesis.blockedReasons[0],
"execution memory retrieval not trusted"
);

}
);

test(
"preserves context synthesis provenance",
() => {

const synthesis =
createExecutionContextSynthesis({

version:
"1.0.0",

objective:
"Provenance test",

trusted:
true,

retrievedEntries:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
synthesis.provenance[0],
"execution memory retrieval verified"
);

assert.equal(
synthesis.version,
"1.0.0"
);

}
);

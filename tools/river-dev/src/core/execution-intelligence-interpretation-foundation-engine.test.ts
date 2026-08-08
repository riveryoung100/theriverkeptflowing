import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceInterpretation
} from "./execution-intelligence-interpretation-foundation-engine";

test(
"creates interpretation from trusted understanding",
() => {

const interpretation =
createExecutionIntelligenceInterpretation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-understanding",

objective:
"Build capability",

understood:
true,

understanding:
[
"execution intelligence meaning established"
],

provenance:
[
"understanding trust verified"
],

blockedReasons:
[]

});

assert.equal(
interpretation.interpreted,
true
);

assert.equal(
interpretation.objective,
"Build capability"
);

assert.equal(
interpretation.interpretation[0],
"trusted understanding state accepted"
);

assert.equal(
interpretation.blockedReasons.length,
0
);

}
);

test(
"blocks interpretation from untrusted understanding",
() => {

const interpretation =
createExecutionIntelligenceInterpretation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-understanding",

objective:
"Unsafe capability",

understood:
false,

understanding:
[
"understanding generation blocked"
],

provenance:
[
"untrusted understanding state recorded"
],

blockedReasons:
[
"execution understanding failed"
]

});

assert.equal(
interpretation.interpreted,
false
);

assert.equal(
interpretation.blockedReasons[0],
"execution understanding not trusted"
);

}
);

test(
"preserves interpretation provenance",
() => {

const interpretation =
createExecutionIntelligenceInterpretation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-understanding",

objective:
"Provenance test",

understood:
true,

understanding:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
interpretation.source,
"river-development-agent-execution-intelligence-interpretation"
);

assert.equal(
interpretation.provenance[0],
"understanding trust verified"
);

assert.equal(
interpretation.version,
"1.0.0"
);

}
);

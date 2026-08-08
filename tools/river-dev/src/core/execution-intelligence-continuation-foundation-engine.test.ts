import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceContinuation
} from "./execution-intelligence-continuation-foundation-engine";

test(
"creates continuation from successful execution outcome",
() => {

const continuation =
createExecutionIntelligenceContinuation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-outcome",

objective:
"Build capability",

successful:
true,

outcome:
[
"authorized execution action completed"
],

provenance:
[
"outcome success verified"
],

blockedReasons:
[]

});

assert.equal(
continuation.continuing,
true
);

assert.equal(
continuation.objective,
"Build capability"
);

assert.equal(
continuation.continuation[0],
"successful execution outcome accepted"
);

assert.equal(
continuation.blockedReasons.length,
0
);

}
);


test(
"blocks continuation from failed execution outcome",
() => {

const continuation =
createExecutionIntelligenceContinuation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-outcome",

objective:
"Unsafe capability",

successful:
false,

outcome:
[
"execution action blocked"
],

provenance:
[
"failed outcome state recorded"
],

blockedReasons:
[
"execution outcome failed"
]

});

assert.equal(
continuation.continuing,
false
);

assert.equal(
continuation.blockedReasons[0],
"execution outcome not successful"
);

}
);


test(
"preserves continuation provenance",
() => {

const continuation =
createExecutionIntelligenceContinuation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-outcome",

objective:
"Provenance test",

successful:
true,

outcome:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
continuation.source,
"river-development-agent-execution-intelligence-continuation"
);

assert.equal(
continuation.provenance[0],
"outcome success verified"
);

assert.equal(
continuation.version,
"1.0.0"
);

}
);

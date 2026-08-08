import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceOutcome
} from "./execution-intelligence-outcome-foundation-engine";

test(
"creates successful outcome from authorized action",
() => {

const outcome =
createExecutionIntelligenceOutcome({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-action",

objective:
"Build capability",

authorized:
true,

actions:
[
"execute approved governed action"
],

provenance:
[
"action authorization verified"
],

blockedReasons:
[]

});

assert.equal(
outcome.successful,
true
);

assert.equal(
outcome.objective,
"Build capability"
);

assert.equal(
outcome.outcome[0],
"authorized execution action completed"
);

assert.equal(
outcome.blockedReasons.length,
0
);

}
);


test(
"blocks outcome from unauthorized action",
() => {

const outcome =
createExecutionIntelligenceOutcome({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-action",

objective:
"Unsafe capability",

authorized:
false,

actions:
[],

provenance:
[
"blocked action state recorded"
],

blockedReasons:
[
"execution action not authorized"
]

});

assert.equal(
outcome.successful,
false
);

assert.equal(
outcome.blockedReasons[0],
"execution action not authorized"
);

}
);


test(
"preserves outcome provenance",
() => {

const outcome =
createExecutionIntelligenceOutcome({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-action",

objective:
"Provenance test",

authorized:
true,

actions:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
outcome.source,
"river-development-agent-execution-intelligence-outcome"
);

assert.equal(
outcome.provenance[0],
"action authorization verified"
);

assert.equal(
outcome.version,
"1.0.0"
);

}
);

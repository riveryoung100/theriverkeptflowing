import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceDecision
} from "./execution-intelligence-decision-foundation-engine";

test(
"creates execute decision from trusted reasoning",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
"Build capability",

trusted:
true,

reasoning:
[
"governed execution reasoning prepared"
],

provenance:
[
"reasoning boundary maintained"
],

blockedReasons:
[]

});

assert.equal(
decision.approved,
true
);

assert.equal(
decision.decision,
"execute"
);

assert.equal(
decision.objective,
"Build capability"
);

assert.equal(
decision.actions[0],
"execute governed implementation"
);

}
);

test(
"holds decision from untrusted reasoning",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
"Unsafe capability",

trusted:
false,

reasoning:
[
"execution reasoning halted"
],

provenance:
[
"blocked reasoning state recorded"
],

blockedReasons:
[
"execution reasoning not trusted"
]

});

assert.equal(
decision.approved,
false
);

assert.equal(
decision.decision,
"hold"
);

assert.equal(
decision.blockedReasons[0],
"execution reasoning not trusted"
);

}
);

test(
"preserves decision provenance",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
"Provenance test",

trusted:
true,

reasoning:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
decision.source,
"river-development-agent-execution-intelligence-decision"
);

assert.equal(
decision.provenance[0],
"reasoning trust verified"
);

assert.equal(
decision.version,
"1.0.0"
);

}
);

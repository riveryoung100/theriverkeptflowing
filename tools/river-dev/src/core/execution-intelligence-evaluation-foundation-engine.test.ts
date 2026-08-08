import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceEvaluation
} from "./execution-intelligence-evaluation-foundation-engine";


test(
"approves evaluation from approved execution intelligence",
() => {

const evaluation =
createExecutionIntelligenceEvaluation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence",

objective:
"Build capability",

decision:
"approved",

understood:
true,

executionActions:
[
"execute approved implementation"
],

preparationSource:
"river-development-agent-execution-preparation",

blockedReasons:
[]

});


assert.equal(
evaluation.approved,
true
);

assert.equal(
evaluation.understood,
true
);

assert.equal(
evaluation.objective,
"Build capability"
);

assert.equal(
evaluation.blockedReasons.length,
0
);

}
);


test(
"blocks evaluation from blocked execution intelligence",
() => {

const evaluation =
createExecutionIntelligenceEvaluation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence",

objective:
"Unsafe capability",

decision:
"blocked",

understood:
false,

executionActions:
[],

preparationSource:
"river-development-agent-execution-preparation",

blockedReasons:
[
"execution authorization missing"
]

});


assert.equal(
evaluation.approved,
false
);

assert.equal(
evaluation.understood,
false
);

assert.equal(
evaluation.blockedReasons[0],
"execution intelligence not approved"
);

}
);


test(
"preserves evaluation provenance",
() => {

const evaluation =
createExecutionIntelligenceEvaluation({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence",

objective:
"Provenance test",

decision:
"approved",

understood:
true,

executionActions:
[],

preparationSource:
"river-development-agent-execution-preparation",

blockedReasons:
[]

});


assert.equal(
evaluation.source,
"river-development-agent-execution-intelligence-evaluation"
);

assert.equal(
evaluation.provenance[0],
"execution intelligence verified"
);

assert.equal(
evaluation.version,
"1.0.0"
);

}
);

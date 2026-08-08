import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceReasoning
} from "./execution-intelligence-reasoning-foundation-engine";

test(
"creates trusted reasoning from approved evaluation",
() => {

const reasoning =
createExecutionIntelligenceReasoning({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evaluation",

objective:
"Build capability",

approved:
true,

understood:
true,

evaluation:
[
"execution intelligence approved"
],

provenance:
[
"execution intelligence verified"
],

blockedReasons:
[]

});

assert.equal(
reasoning.trusted,
true
);

assert.equal(
reasoning.objective,
"Build capability"
);

assert.equal(
reasoning.blockedReasons.length,
0
);

assert.equal(
reasoning.reasoning[0],
"execution evaluation accepted"
);

}
);

test(
"blocks reasoning from rejected evaluation",
() => {

const reasoning =
createExecutionIntelligenceReasoning({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evaluation",

objective:
"Unsafe capability",

approved:
false,

understood:
false,

evaluation:
[
"execution intelligence blocked"
],

provenance:
[
"blocked evaluation state recorded"
],

blockedReasons:
[
"execution intelligence not approved"
]

});

assert.equal(
reasoning.trusted,
false
);

assert.equal(
reasoning.blockedReasons[0],
"execution intelligence evaluation not approved"
);

}
);

test(
"preserves reasoning provenance",
() => {

const reasoning =
createExecutionIntelligenceReasoning({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evaluation",

objective:
"Provenance test",

approved:
true,

understood:
true,

evaluation:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
reasoning.source,
"river-development-agent-execution-intelligence-reasoning"
);

assert.equal(
reasoning.provenance[0],
"execution evaluation verified"
);

assert.equal(
reasoning.version,
"1.0.0"
);

}
);

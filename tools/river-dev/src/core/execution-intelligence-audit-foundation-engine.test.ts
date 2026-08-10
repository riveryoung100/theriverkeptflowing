import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAudit
} from "./execution-intelligence-audit-foundation-engine";

test(
"creates trusted intelligence audit from trusted intelligence compliance",
() => {

const audit =
createExecutionIntelligenceAudit({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

complianceState:
[
"intelligence compliance accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
audit.trusted,
true
);

assert.equal(
audit.auditState.length > 0,
true
);

}
);

test(
"blocks intelligence audit from untrusted intelligence compliance",
() => {

const audit =
createExecutionIntelligenceAudit({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

complianceState:
[
"intelligence compliance blocked"
],

provenance:
[
"preserved"
],

blockedReasons:
[
"blocked"
]

});

assert.equal(
audit.trusted,
false
);

assert.equal(
audit.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence audit provenance",
() => {

const audit =
createExecutionIntelligenceAudit({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

complianceState:
[
"validated"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
audit.provenance.length > 0,
true
);

}
);

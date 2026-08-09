import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceOrchestration
} from "./execution-intelligence-orchestration-foundation-engine";


test(
"creates orchestration from authorized action",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

authorized:
true,

actions:
[
"execute approved change"
],

provenance:
[
"action verified"
],

blockedReasons:
[]

});


assert.equal(
orchestration.orchestrated,
true
);


assert.equal(
orchestration.authorized,
true
);


assert.equal(
orchestration.pipeline.length > 0,
true
);


});


test(
"blocks orchestration from unauthorized action",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

authorized:
false,

actions:
[
"review required"
],

provenance:
[
"action preserved"
],

blockedReasons:
[
"authorization missing"
]

});


assert.equal(
orchestration.orchestrated,
false
);


assert.equal(
orchestration.blockedReasons.length > 0,
true
);


});


test(
"preserves orchestration provenance",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"validate execution chain",

authorized:
true,

actions:
[
"validate chain"
],

provenance:
[
"action verified"
],

blockedReasons:
[]

});


assert.equal(
orchestration.provenance.length > 0,
true
);


});


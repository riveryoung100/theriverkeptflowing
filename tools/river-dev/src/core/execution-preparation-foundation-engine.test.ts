import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionPreparation
} from "./execution-preparation-foundation-engine";


test(
"creates authorized execution preparation from trusted implementation intelligence",
() => {

const preparation =
createExecutionPreparation({

version:
"1.0.0",

source:
"implementation-test",

objective:
"Build capability",

planSource:
"river-development-agent-planning-intelligence",

proposedChanges:
[
"create controlled change"
],

validationSteps:
[
"run tests"
],

trusted:
true

});


assert.equal(
preparation.authorized,
true
);


assert.equal(
preparation.objective,
"Build capability"
);


assert.equal(
preparation.executionSteps[0],
"review implementation proposal"
);


}
);



test(
"blocks execution preparation from untrusted implementation intelligence",
() => {

const preparation =
createExecutionPreparation({

version:
"1.0.0",

source:
"implementation-test",

objective:
"Unsafe capability",

planSource:
"river-development-agent-planning-intelligence",

proposedChanges:
[],

validationSteps:
[],

trusted:
false

});


assert.equal(
preparation.authorized,
false
);


}
);



test(
"preserves execution preparation provenance",
() => {

const preparation =
createExecutionPreparation({

version:
"1.0.0",

source:
"implementation-foundation",

objective:
"Provenance test",

planSource:
"planning-foundation",

proposedChanges:
[],

validationSteps:
[],

trusted:
true

});


assert.equal(
preparation.source,
"river-development-agent-execution-preparation"
);


assert.equal(
preparation.implementationSource,
"river-development-agent-implementation-intelligence"
);


}
);

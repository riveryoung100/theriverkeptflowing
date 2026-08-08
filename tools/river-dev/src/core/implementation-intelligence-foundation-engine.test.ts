import test from "node:test";
import assert from "node:assert/strict";

import {
createImplementationIntelligence
} from "./implementation-intelligence-foundation-engine";


test(
"creates trusted implementation intelligence from trusted planning intelligence",
() => {

const implementation =
createImplementationIntelligence({

version:
"1.0.0",

source:
"planning-test",

objective:
"Build capability",

projectRepository:
"RIVERKEPTFLOWING",

steps:
[
"inspect",
"implement"
],

risks:
[
"scope expansion"
],

trusted:
true

});


assert.equal(
implementation.trusted,
true
);


assert.equal(
implementation.objective,
"Build capability"
);


assert.equal(
implementation.proposedChanges[0],
"identify required files"
);

}
);


test(
"blocks trusted implementation intelligence from untrusted planning intelligence",
() => {

const implementation =
createImplementationIntelligence({

version:
"1.0.0",

source:
"planning-test",

objective:
"Unsafe capability",

projectRepository:
"unknown",

steps:
[],

risks:
[
"missing validation"
],

trusted:
false

});


assert.equal(
implementation.trusted,
false
);

}
);


test(
"preserves implementation intelligence provenance",
() => {

const implementation =
createImplementationIntelligence({

version:
"1.0.0",

source:
"planning-foundation",

objective:
"Provenance test",

projectRepository:
"repository",

steps:
[],

risks:
[],

trusted:
true

});


assert.equal(
implementation.source,
"river-development-agent-implementation-intelligence"
);


assert.equal(
implementation.planSource,
"river-development-agent-planning-intelligence"
);

}
);

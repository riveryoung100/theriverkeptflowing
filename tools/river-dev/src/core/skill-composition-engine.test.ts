import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionSkillComposition
} from "./skill-composition-engine";

test(
"creates trusted compositions from trusted skills",
() => {

const composition =
createExecutionSkillComposition(
{
version:
"1.0.0",

objective:
"Composition test",

trusted:
true,

skills: [

{
category:
"architecture",

name:
"boundary",

description:
"preserve existing boundary",

source:
"controlled-execution-skill"

}

],

blockedReasons:
[]

}
);

assert.equal(
composition.version,
"1.0.0"
);

assert.equal(
composition.compositions[0]!.name,
"boundary"
);

assert.equal(
composition.compositions[0]!.skills[0],
"boundary"
);

assert.equal(
composition.trusted,
true
);

}
);

test(
"blocks trusted compositions from untrusted skills",
() => {

const composition =
createExecutionSkillComposition(
{
version:
"1.0.0",

objective:
"Blocked composition test",

trusted:
false,

skills: [

{
category:
"execution",

name:
"decision",

description:
"do not proceed",

source:
"controlled-execution-skill"

}

],

blockedReasons:
[
"do not proceed"
]

}
);

assert.equal(
composition.trusted,
false
);

assert.equal(
composition.blockedReasons.length,
1
);

}
);

test(
"preserves skill provenance in compositions",
() => {

const composition =
createExecutionSkillComposition(
{
version:
"1.0.0",

objective:
"Source composition test",

trusted:
true,

skills: [

{
category:
"reasoning",

name:
"approval",

description:
"await approval",

source:
"controlled-execution-reasoning"

}

],

blockedReasons:
[]

}
);

assert.equal(
composition.compositions[0]!.source,
"controlled-execution-reasoning"
);

}
);

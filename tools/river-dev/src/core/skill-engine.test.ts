import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionSkill
} from "./skill-engine";

test(
"creates trusted skills from trusted capabilities",
() => {

const skill =
createExecutionSkill(
{
version:
"1.0.0",

objective:
"Skill test",

trusted:
true,

capabilities: [

{
category:
"architecture",

name:
"boundary",

description:
"preserve existing boundary",

source:
"controlled-execution-capability"

}

],

blockedReasons:
[]

}
);

assert.equal(
skill.version,
"1.0.0"
);

assert.equal(
skill.skills[0]!.name,
"boundary"
);

assert.equal(
skill.trusted,
true
);

}
);


test(
"blocks trusted skills from untrusted capabilities",
() => {

const skill =
createExecutionSkill(
{
version:
"1.0.0",

objective:
"Blocked skill test",

trusted:
false,

capabilities: [

{
category:
"execution",

name:
"decision",

description:
"do not proceed",

source:
"controlled-execution-capability"

}

],

blockedReasons:
[
"do not proceed"
]

}
);

assert.equal(
skill.trusted,
false
);

assert.equal(
skill.blockedReasons.length,
1
);

}
);


test(
"preserves capability provenance in skills",
() => {

const skill =
createExecutionSkill(
{
version:
"1.0.0",

objective:
"Source skill test",

trusted:
true,

capabilities: [

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
skill.skills[0]!.source,
"controlled-execution-reasoning"
);

}
);

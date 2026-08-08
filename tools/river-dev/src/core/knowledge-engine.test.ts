import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionKnowledge
} from "./knowledge-engine";

test(
"creates trusted knowledge from trusted memory",
() => {

const knowledge =
createExecutionKnowledge(
{
version:
"1.0.0",

objective:
"Knowledge test",

trusted:
true,

entries: [

{
category:
"architecture",

key:
"boundary",

value:
"preserve existing boundary",

source:
"controlled-execution-memory"
}

],

blockedReasons:
[]

}
);

assert.equal(
knowledge.version,
"1.0.0"
);

assert.equal(
knowledge.objects[0]!.category,
"architecture"
);

assert.equal(
knowledge.trusted,
true
);

}
);


test(
"blocks trusted knowledge from untrusted memory",
() => {

const knowledge =
createExecutionKnowledge(
{
version:
"1.0.0",

objective:
"Blocked knowledge test",

trusted:
false,

entries: [

{
category:
"execution",

key:
"decision",

value:
"do not proceed",

source:
"controlled-execution-memory"
}

],

blockedReasons:
[
"do not proceed"
]

}
);

assert.equal(
knowledge.trusted,
false
);

assert.equal(
knowledge.blockedReasons.length,
1
);

}
);


test(
"preserves source provenance in knowledge objects",
() => {

const knowledge =
createExecutionKnowledge(
{
version:
"1.0.0",

objective:
"Source test",

trusted:
true,

entries: [

{
category:
"reasoning",

key:
"decision",

value:
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
knowledge.objects[0]!.source,
"controlled-execution-reasoning"
);

}
);

import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionMemoryRetrieval
} from "./execution-memory-retrieval-foundation-engine";


test(
"retrieves entries from trusted execution memory",
() => {

const retrieval =
createExecutionMemoryRetrieval({

version:
"1.0.0",

objective:
"Build capability",

trusted:
true,

entries:
[
{
category:
"execution",

key:
"state",

value:
"completed",

source:
"river-development-agent-execution-memory"
}
],

blockedReasons:
[]

});


assert.equal(
retrieval.trusted,
true
);

assert.equal(
retrieval.objective,
"Build capability"
);

assert.equal(
retrieval.retrievedEntries.length,
1
);

assert.equal(
retrieval.retrievedEntries[0]!.value,
"completed"
);

}
);


test(
"blocks retrieval from untrusted execution memory",
() => {

const retrieval =
createExecutionMemoryRetrieval({

version:
"1.0.0",

objective:
"Unsafe capability",

trusted:
false,

entries:
[
{
category:
"execution",

key:
"state",

value:
"blocked",

source:
"river-development-agent-execution-memory"
}
],

blockedReasons:
[
"execution not authorized"
]

});


assert.equal(
retrieval.trusted,
false
);

assert.equal(
retrieval.retrievedEntries.length,
0
);

assert.equal(
retrieval.blockedReasons[0],
"execution memory not trusted"
);

}
);


test(
"preserves retrieval provenance",
() => {

const retrieval =
createExecutionMemoryRetrieval({

version:
"1.0.0",

objective:
"Provenance test",

trusted:
true,

entries:
[],

blockedReasons:
[]

});


assert.equal(
retrieval.provenance[0],
"execution memory validated"
);

assert.equal(
retrieval.version,
"1.0.0"
);

}
);

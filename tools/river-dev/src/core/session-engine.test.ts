import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionSession
} from "./session-engine";

test(
"creates deterministic execution sessions with approvals",
() => {

const session =
createExecutionSession(
{
version:
"1.0.0",

objective:
"Session approval test",

ready:
true,

steps: [

{
id:
"step-1",

taskId:
"task-1",

order:
1,

status:
"approval-required",

reason:
"requires human approval"
},

{
id:
"step-2",

taskId:
"task-2",

order:
2,

status:
"ready",

reason:
"safe execution"
}

],

blockedReasons:
[]

}
);

assert.equal(
session.version,
"1.0.0"
);

assert.equal(
session.approvals[0]!.state,
"pending"
);

assert.equal(
session.approvals[1]!.state,
"approved"
);

assert.equal(
session.ready,
false
);

}
);

test(
"rejects sessions with blocked workflow steps",
() => {

const session =
createExecutionSession(
{
version:
"1.0.0",

objective:
"Blocked session test",

ready:
false,

steps: [

{
id:
"step-1",

taskId:
"task-1",

order:
1,

status:
"blocked",

reason:
"protected path blocked"
}

],

blockedReasons:
[
"protected path blocked"
]

}
);

assert.equal(
session.ready,
false
);

assert.equal(
session.approvals[0]!.state,
"rejected"
);

assert.equal(
session.blockedReasons.length,
1
);

}
);

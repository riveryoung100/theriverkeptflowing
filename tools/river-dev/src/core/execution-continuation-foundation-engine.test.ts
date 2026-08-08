import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionContinuation
} from "./execution-continuation-foundation-engine";

test(
"creates continuation from successful execution reporting",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"execution-reporting-test",

objective:
"Build capability",

outcomeSource:
"river-development-agent-execution-outcome",

reportState:
"successful",

reportEntries:
[
"execution outcome validated"
],

validationSummary:
[
"verify authorization"
],

authorized:
true

});

assert.equal(
continuation.continuationState,
"continue"
);

assert.equal(
continuation.authorized,
true
);

assert.equal(
continuation.objective,
"Build capability"
);

assert.equal(
continuation.continuationActions[0],
"continue governed execution flow"
);

}
);


test(
"halts continuation from blocked execution reporting",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"execution-reporting-test",

objective:
"Unsafe capability",

outcomeSource:
"river-development-agent-execution-outcome",

reportState:
"blocked",

reportEntries:
[
"execution outcome blocked"
],

validationSummary:
[],

authorized:
false

});

assert.equal(
continuation.continuationState,
"halt"
);

assert.equal(
continuation.authorized,
false
);

assert.equal(
continuation.continuationActions[0],
"halt continuation flow"
);

}
);


test(
"preserves continuation provenance",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"execution-reporting-test",

objective:
"Provenance test",

outcomeSource:
"river-development-agent-execution-outcome",

reportState:
"successful",

reportEntries:
[],

validationSummary:
[],

authorized:
true

});

assert.equal(
continuation.source,
"river-development-agent-execution-continuation"
);

assert.equal(
continuation.reportingSource,
"river-development-agent-execution-reporting"
);

}
);

import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionReporting
} from "./execution-reporting-foundation-engine";

test(
"creates successful report from successful execution outcome",
() => {

const report =
createExecutionReporting({

version:
"1.0.0",

source:
"execution-outcome-test",

objective:
"Build capability",

lifecycleSource:
"river-development-agent-execution-lifecycle",

outcome:
"successful",

executionResult:
[
"execution lifecycle completed"
],

validationSummary:
[
"verify authorization"
],

authorized:
true

});

assert.equal(
report.reportState,
"successful"
);

assert.equal(
report.authorized,
true
);

assert.equal(
report.objective,
"Build capability"
);

assert.equal(
report.reportEntries[0],
"execution outcome validated"
);

}
);

test(
"blocks report from blocked execution outcome",
() => {

const report =
createExecutionReporting({

version:
"1.0.0",

source:
"execution-outcome-test",

objective:
"Unsafe capability",

lifecycleSource:
"river-development-agent-execution-lifecycle",

outcome:
"blocked",

executionResult:
[
"execution outcome blocked"
],

validationSummary:
[],

authorized:
false

});

assert.equal(
report.reportState,
"blocked"
);

assert.equal(
report.authorized,
false
);

assert.equal(
report.reportEntries[0],
"execution outcome blocked"
);

}
);

test(
"preserves reporting provenance",
() => {

const report =
createExecutionReporting({

version:
"1.0.0",

source:
"execution-outcome-test",

objective:
"Provenance test",

lifecycleSource:
"river-development-agent-execution-lifecycle",

outcome:
"successful",

executionResult:
[],

validationSummary:
[],

authorized:
true

});

assert.equal(
report.source,
"river-development-agent-execution-reporting"
);

assert.equal(
report.outcomeSource,
"river-development-agent-execution-outcome"
);

}
);

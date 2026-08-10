import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceReview
} from "./execution-intelligence-review-foundation-engine";

test(
"creates trusted intelligence review from trusted intelligence oversight",
() => {

const review =
createExecutionIntelligenceReview({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

oversightState:
[
"intelligence oversight accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
review.trusted,
true
);

assert.equal(
review.reviewState.length > 0,
true
);

}
);

test(
"blocks intelligence review from untrusted intelligence oversight",
() => {

const review =
createExecutionIntelligenceReview({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

oversightState:
[
"intelligence oversight blocked"
],

provenance:
[
"preserved"
],

blockedReasons:
[
"blocked"
]

});

assert.equal(
review.trusted,
false
);

assert.equal(
review.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence review provenance",
() => {

const review =
createExecutionIntelligenceReview({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

oversightState:
[
"validated"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
review.provenance.length > 0,
true
);

}
);

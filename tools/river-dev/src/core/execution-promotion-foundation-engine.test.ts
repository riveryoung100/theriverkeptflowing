import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionPromotion
} from "./execution-promotion-foundation-engine";

test(
"creates trusted promotion from trusted governance",
() => {

const promotion =
createExecutionPromotion({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

governanceState:
[
"governance approved"
],

provenance:
[
"governance verified"
],

blockedReasons:
[]

});

assert.equal(
promotion.trusted,
true
);

assert.equal(
promotion.promotionState.length > 0,
true
);

});

test(
"blocks promotion from untrusted governance",
() => {

const promotion =
createExecutionPromotion({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

governanceState:
[
"governance blocked"
],

provenance:
[
"governance preserved"
],

blockedReasons:
[
"governance not trusted"
]

});

assert.equal(
promotion.trusted,
false
);

assert.equal(
promotion.blockedReasons.length > 0,
true
);

});

test(
"preserves execution promotion provenance",
() => {

const promotion =
createExecutionPromotion({

version:
"1.0.0",

source:
"test",

objective:
"validate promotion chain",

trusted:
true,

governanceState:
[
"validated"
],

provenance:
[
"governance verified"
],

blockedReasons:
[]

});

assert.equal(
promotion.provenance.length > 0,
true
);

});

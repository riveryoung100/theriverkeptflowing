import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSeshCreatorHandle,
  validateSeshCreatorHandleReservation,
} from "./creator-handle";

import {
  createSeshCreatorId,
} from "./identifiers";

test(
  "normalizes creator handles deterministically",
  () => {
    assert.equal(
      normalizeSeshCreatorHandle(
        "  River_Young  ",
      ),
      "river_young",
    );
  },
);

test(
  "normalizes Unicode compatibility forms before canonical validation",
  () => {
    assert.equal(
      normalizeSeshCreatorHandle(
        "ＲＩＶＥＲ123",
      ),
      "river123",
    );
  },
);

for (
  const invalid of [
    "",
    "ab",
    "_river",
    "river_",
    "-river",
    "river-",
    "river__young",
    "river--young",
    "river young",
    "river.young",
    "river@young",
    "this-handle-is-more-than-thirty-two-characters-long",
  ]
) {
  test(
    `rejects invalid creator handle ${JSON.stringify(invalid)}`,
    () => {
      assert.throws(
        () =>
          normalizeSeshCreatorHandle(
            invalid,
          ),
        TypeError,
      );
    },
  );
}

test(
  "validates a canonical creator handle reservation",
  () => {
    const creatorId =
      createSeshCreatorId(
        "handle-test",
      );

    const reservation =
      validateSeshCreatorHandleReservation({
        normalizedHandle:
          "river_young",

        creatorId,

        createdAt:
          "2026-09-22T20:00:00.000Z",
      });

    assert.equal(
      reservation.normalizedHandle,
      "river_young",
    );

    assert.equal(
      reservation.creatorId,
      creatorId,
    );
  },
);

test(
  "rejects non-canonical normalized handle storage",
  () => {
    assert.throws(
      () =>
        validateSeshCreatorHandleReservation({
          normalizedHandle:
            "River_Young",

          creatorId:
            createSeshCreatorId(
              "handle-test",
            ),

          createdAt:
            "2026-09-22T20:00:00.000Z",
        }),
      /canonical normalized handle/,
    );
  },
);
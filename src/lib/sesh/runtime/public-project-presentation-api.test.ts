import assert from "node:assert/strict";
import test from "node:test";

import {
  createPublicSeshProjectPresentationAtRuntime,
} from "./public-project-presentation-api";

test(
  "composes anonymous public project presentation from SESH_DB only",
  () => {
    const database = {
      prepare() {
        throw new Error(
          "query execution not expected during composition",
        );
      },
    };

    const service =
      createPublicSeshProjectPresentationAtRuntime({
        SESH_DB:
          database,
      });

    assert.equal(
      typeof service.resolveByProjectId,
      "function",
    );
  },
);

test(
  "public project presentation runtime fails closed without SESH_DB",
  () => {
    assert.throws(
      () =>
        createPublicSeshProjectPresentationAtRuntime(
          {},
        ),
      /SESH_DB/,
    );
  },
);

test(
  "public project presentation runtime requires no identity session or R2 bindings",
  () => {
    const database = {
      prepare() {
        throw new Error(
          "query execution not expected during composition",
        );
      },
    };

    assert.doesNotThrow(
      () =>
        createPublicSeshProjectPresentationAtRuntime({
          SESH_DB:
            database,
        }),
    );
  },
);
import assert from "node:assert/strict";
import test from "node:test";

import {
  createPublicSeshProjectDiscoveryAtRuntime,
} from "./public-project-discovery-api";

test(
  "composes anonymous public project discovery from SESH_DB only",
  () => {
    const database = {
      prepare() {
        throw new Error(
          "query execution not expected during composition",
        );
      },
    };

    const service =
      createPublicSeshProjectDiscoveryAtRuntime({
        SESH_DB:
          database,
      });

    assert.equal(
      typeof service.listPublicProjects,
      "function",
    );
  },
);

test(
  "public project discovery runtime fails closed without SESH_DB",
  () => {
    assert.throws(
      () =>
        createPublicSeshProjectDiscoveryAtRuntime(
          {},
        ),
      /SESH_DB/,
    );
  },
);

test(
  "public project discovery runtime requires no identity session or R2 bindings",
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
        createPublicSeshProjectDiscoveryAtRuntime({
          SESH_DB:
            database,
        }),
    );
  },
);
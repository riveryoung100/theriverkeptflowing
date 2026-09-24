import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createCreatorPrivateAudioReadAtRuntime,
} from "./creator-private-audio-read-api";

test(
  "private binary audio runtime fails closed without session support",
  () => {
    assert.throws(
      () =>
        createCreatorPrivateAudioReadAtRuntime(
          null as unknown as AstroSessionLike,
          {} as never,
        ),
      /session support/i,
    );
  },
);

test(
  "private binary audio runtime fails closed without required Cloudflare persistence",
  () => {
    const session = {
      get() {
        return undefined;
      },

      set() {
        return undefined;
      },

      delete() {
        return undefined;
      },
    } as unknown as AstroSessionLike;

    assert.throws(
      () =>
        createCreatorPrivateAudioReadAtRuntime(
          session,
          {} as never,
        ),
    );
  },
);
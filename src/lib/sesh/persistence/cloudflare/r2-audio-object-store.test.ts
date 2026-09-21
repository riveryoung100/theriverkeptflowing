import assert from "node:assert/strict";
import test from "node:test";

import {
  R2SeshAudioObjectStore,
} from "./r2-audio-object-store";
import type {
  SeshR2BucketLike,
  SeshR2ObjectLike,
} from "./types";

class FakeR2Bucket
implements SeshR2BucketLike {
  readonly objects = new Map<string, Uint8Array>();
  fail = false;

  async put(
    key: string,
    value: Uint8Array,
  ): Promise<void> {
    if (this.fail) {
      throw new Error("fake R2 failure");
    }

    this.objects.set(
      key,
      new Uint8Array(value),
    );
  }

  async get(
    key: string,
  ): Promise<SeshR2ObjectLike | null> {
    if (this.fail) {
      throw new Error("fake R2 failure");
    }

    const bytes = this.objects.get(key);

    if (bytes === undefined) {
      return null;
    }

    const copy = new Uint8Array(bytes);

    return {
      async arrayBuffer(): Promise<ArrayBuffer> {
        return copy.buffer.slice(
          copy.byteOffset,
          copy.byteOffset + copy.byteLength,
        ) as ArrayBuffer;
      },
    };
  }

  async delete(
    key: string,
  ): Promise<void> {
    if (this.fail) {
      throw new Error("fake R2 failure");
    }

    this.objects.delete(key);
  }

  async head(
    key: string,
  ): Promise<unknown | null> {
    if (this.fail) {
      throw new Error("fake R2 failure");
    }

    return this.objects.has(key)
      ? { key }
      : null;
  }
}

test("R2 adapter stores and returns copied binary bytes", async () => {
  const bucket = new FakeR2Bucket();
  const store =
    new R2SeshAudioObjectStore(bucket);

  const reference = {
    provider: "r2",
    key: "sesh/projects/alpha/audio/one/take.wav",
  };

  const source = new Uint8Array([1, 2, 3]);

  const saved = await store.putObject(
    reference,
    source,
  );

  assert.equal(saved.ok, true);

  source[0] = 99;

  const loaded = await store.getObject(reference);

  assert.equal(loaded.ok, true);

  if (!loaded.ok) {
    throw new Error("Expected object.");
  }

  assert.deepEqual(
    Array.from(loaded.value.bytes),
    [1, 2, 3],
  );

  loaded.value.bytes[1] = 88;

  const loadedAgain = await store.getObject(reference);

  assert.equal(loadedAgain.ok, true);

  if (!loadedAgain.ok) {
    throw new Error("Expected object.");
  }

  assert.deepEqual(
    Array.from(loadedAgain.value.bytes),
    [1, 2, 3],
  );
});

test("R2 adapter maps missing objects to not-found", async () => {
  const store =
    new R2SeshAudioObjectStore(new FakeR2Bucket());

  const result = await store.getObject({
    provider: "r2",
    key: "missing.wav",
  });

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected not-found.");
  }

  assert.equal(result.error.kind, "not-found");
});

test("R2 adapter maps provider failures to storage", async () => {
  const bucket = new FakeR2Bucket();
  bucket.fail = true;

  const store =
    new R2SeshAudioObjectStore(bucket);

  const result = await store.objectExists({
    provider: "r2",
    key: "audio.wav",
  });

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected storage failure.");
  }

  assert.equal(result.error.kind, "storage");
});

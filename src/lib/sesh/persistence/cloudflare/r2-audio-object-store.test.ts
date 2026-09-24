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
    options?: {
      readonly range?: {
        readonly offset?: number;
        readonly length?: number;
        readonly suffix?: number;
      };
    },
  ): Promise<SeshR2ObjectLike | null> {
    if (this.fail) {
      throw new Error("fake R2 failure");
    }

    const bytes =
      this.objects.get(
        key,
      );

    if (
      bytes ===
      undefined
    ) {
      return null;
    }

    const requested =
      options?.range;

    let start =
      0;

    let length =
      bytes.byteLength;

    if (
      requested?.suffix !==
      undefined
    ) {
      length =
        Math.min(
          requested.suffix,
          bytes.byteLength,
        );

      start =
        bytes.byteLength -
        length;
    }
    else if (
      requested !==
      undefined
    ) {
      start =
        requested.offset ??
        0;

      length =
        Math.min(
          requested.length ??
            (
              bytes.byteLength -
              start
            ),
          bytes.byteLength -
            start,
        );
    }

    const copy =
      bytes.slice(
        start,
        start +
          length,
      );

    return {
      size:
        bytes.byteLength,

      range:
        requested,

      async arrayBuffer():
      Promise<ArrayBuffer> {
        return copy.buffer.slice(
          copy.byteOffset,
          copy.byteOffset +
            copy.byteLength,
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

    const bytes =
      this.objects.get(
        key,
      );

    return bytes ===
      undefined
      ? null
      : {
          size:
            bytes.byteLength,
        };
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

test(
  "R2 adapter performs a true bounded ranged read without loading the whole object",
  async () => {
    const bucket =
      new FakeR2Bucket();

    const store =
      new R2SeshAudioObjectStore(
        bucket,
      );

    const reference = {
      provider:
        "r2",
      key:
        "range.wav",
    };

    await store.putObject(
      reference,
      Uint8Array.from([
        10,
        20,
        30,
        40,
        50,
        60,
      ]),
    );

    const result =
      await store.getObject(
        reference,
        {
          offset:
            2,
          length:
            3,
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      throw new Error(
        "Expected ranged object.",
      );
    }

    assert.deepEqual(
      Array.from(
        result.value.bytes,
      ),
      [
        30,
        40,
        50,
      ],
    );

    assert.equal(
      result.value.totalSize,
      6,
    );

    assert.deepEqual(
      result.value.range,
      {
        offset:
          2,
        length:
          3,
      },
    );
  },
);

test(
  "R2 adapter supports suffix and open-ended reads and rejects unsatisfiable offsets",
  async () => {
    const store =
      new R2SeshAudioObjectStore(
        new FakeR2Bucket(),
      );

    const reference = {
      provider:
        "r2",
      key:
        "seek.wav",
    };

    await store.putObject(
      reference,
      Uint8Array.from([
        1,
        2,
        3,
        4,
        5,
      ]),
    );

    const suffix =
      await store.getObject(
        reference,
        {
          suffix:
            2,
        },
      );

    assert.equal(
      suffix.ok,
      true,
    );

    if (!suffix.ok) {
      throw new Error(
        "Expected suffix range.",
      );
    }

    assert.deepEqual(
      Array.from(
        suffix.value.bytes,
      ),
      [
        4,
        5,
      ],
    );

    assert.deepEqual(
      suffix.value.range,
      {
        offset:
          3,
        length:
          2,
      },
    );

    const openEnded =
      await store.getObject(
        reference,
        {
          offset:
            3,
        },
      );

    assert.equal(
      openEnded.ok,
      true,
    );

    if (!openEnded.ok) {
      throw new Error(
        "Expected open-ended range.",
      );
    }

    assert.deepEqual(
      Array.from(
        openEnded.value.bytes,
      ),
      [
        4,
        5,
      ],
    );

    const invalid =
      await store.getObject(
        reference,
        {
          offset:
            5,
        },
      );

    assert.equal(
      invalid.ok,
      false,
    );

    if (invalid.ok) {
      throw new Error(
        "Expected unsatisfiable range.",
      );
    }

    assert.equal(
      invalid.error.kind,
      "validation",
    );
  },
);
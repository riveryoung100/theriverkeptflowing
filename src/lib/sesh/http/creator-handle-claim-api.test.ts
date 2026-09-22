import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthenticatedSeshCreatorHandleClaimService,
  SeshCreatorHandleClaimResult,
} from "../operations";

import {
  handleSeshCreatorHandleClaim,
} from "./creator-handle-claim-api";

function request(
  body:
    string,

  origin =
    "https://theriverkeptflowing.com",

  url =
    "https://theriverkeptflowing.com/api/sesh/creator/handle",
): Request {
  return new Request(
    url,
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json",

        origin,
      },

      body,
    },
  );
}

function service(
  result:
    SeshCreatorHandleClaimResult,

  onClaim?:
    (value: unknown) => void,
): AuthenticatedSeshCreatorHandleClaimService {
  return {
    async claimHandle(
      value,
    ) {
      onClaim?.(
        value,
      );

      return result;
    },
  };
}

const successResult: SeshCreatorHandleClaimResult = {
  ok:
    true,

  value: {
    normalizedHandle:
      "river" as never,

    creatorId:
      "sesh-creator:test" as never,

    createdAt:
      "2026-09-22T21:00:00.000Z",
  },
};

test(
  "claims a handle through a same-origin POST and passes only the handle string",
  async () => {
    let received:
      unknown;

    const response =
      await handleSeshCreatorHandleClaim({
        request:
          request(
            JSON.stringify({
              handle:
                "  River  ",
            }),
          ),

        claims:
          service(
            successResult,
            value => {
              received =
                value;
            },
          ),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      received,
      "  River  ",
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    const body =
      await response.json() as {
        readonly ok:
          boolean;
    };

    assert.equal(
      body.ok,
      true,
    );
  },
);

test(
  "rejects cross-origin claim before service execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorHandleClaim({
        request:
          request(
            JSON.stringify({
              handle:
                "river",
            }),
            "https://example.com",
          ),

        claims:
          service(
            successResult,
            () => {
              calls +=
                1;
            },
          ),
      });

    assert.equal(
      response.status,
      403,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

for (
  const value of [
    [],
    null,
    "river",
    42,
    {},
    {
      handle:
        "river",

      creatorId:
        "sesh-creator:attacker",
    },
    {
      handle:
        "river",

      principalId:
        "principal:attacker",
    },
    {
      handle:
        "river",

      seshCreatorId:
        "sesh-creator:attacker",
    },
    {
      handle:
        "river",

      createdAt:
        "2026-09-22T00:00:00.000Z",
    },
    {
      handle:
        "river",

      release:
        true,
    },
    {
      handle:
        "river",

      rename:
        "other",
    },
    {
      handle:
        "river",

      unexpected:
        true,
    },
  ]
) {
  test(
    `rejects invalid or expanded claim body ${JSON.stringify(value)} before operation execution`,
    async () => {
      let calls =
        0;

      const response =
        await handleSeshCreatorHandleClaim({
          request:
            request(
              JSON.stringify(
                value,
              ),
            ),

          claims:
            service(
              successResult,
              () => {
                calls +=
                  1;
              },
            ),
        });

      assert.equal(
        response.status,
        400,
      );

      assert.equal(
        calls,
        0,
      );
    },
  );
}

test(
  "rejects a non-string handle before operation execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorHandleClaim({
        request:
          request(
            JSON.stringify({
              handle:
                123,
            }),
          ),

        claims:
          service(
            successResult,
            () => {
              calls +=
                1;
            },
          ),
      });

    assert.equal(
      response.status,
      400,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "rejects malformed JSON before operation execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorHandleClaim({
        request:
          request(
            "{",
          ),

        claims:
          service(
            successResult,
            () => {
              calls +=
                1;
            },
          ),
      });

    assert.equal(
      response.status,
      400,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

for (
  const [
    code,
    status,
  ] of [
    [
      "invalid-input",
      400,
    ],
    [
      "unauthenticated",
      401,
    ],
    [
      "unmapped",
      403,
    ],
    [
      "conflict",
      409,
    ],
    [
      "unavailable",
      503,
    ],
  ] as const
) {
  test(
    `maps ${code} claim failure to HTTP ${status}`,
    async () => {
      const response =
        await handleSeshCreatorHandleClaim({
          request:
            request(
              JSON.stringify({
                handle:
                  "river",
              }),
            ),

          claims:
            service({
              ok:
                false,

              error: {
                code,

                message:
                  "failure",
              },
            }),
        });

      assert.equal(
        response.status,
        status,
      );
    },
  );
}
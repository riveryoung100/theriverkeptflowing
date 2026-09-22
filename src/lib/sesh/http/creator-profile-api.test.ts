import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshCreatorProfileProvisioningResult,
  SeshCreatorProfileProvisioningService,
} from "../operations";

import {
  handleSeshCreatorProfileProvisioning,
} from "./creator-profile-api";

function service(
  result:
    SeshCreatorProfileProvisioningResult,
  onCall?:
    () => void,
): SeshCreatorProfileProvisioningService {
  return {
    async provision() {
      onCall?.();

      return result;
    },
  };
}

async function body(
  response:
    Response,
): Promise<
  Record<
    string,
    unknown
  >
> {
  return await response.json() as
    Record<
      string,
      unknown
    >;
}

const success =
  {
    ok:
      true,

    value: {
      principalId:
        "principal:http-test",

      seshCreatorId:
        "sesh-creator:http-test",

      profile: {
        id:
          "sesh-creator:http-test",

        displayName:
          "River",

        createdAt:
          "2026-09-22T19:00:00.000Z",
      },
    },
  } as
    SeshCreatorProfileProvisioningResult;

test(
  "provisions an authenticated creator through a same-origin POST",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileProvisioning({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/provision",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  displayName:
                    "River",
                }),
            },
          ),

        provisioning:
          service(
            success,
            () => {
              calls +=
                1;
            },
          ),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.equal(
      calls,
      1,
    );

    const payload =
      await body(
        response,
      );

    assert.equal(
      payload.ok,
      true,
    );
  },
);

test(
  "rejects cross-origin provisioning before service execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileProvisioning({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/provision",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://attacker.example",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  displayName:
                    "River",
                }),
            },
          ),

        provisioning:
          service(
            success,
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

test(
  "rejects malformed JSON before provisioning",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileProvisioning({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/provision",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                "{",
            },
          ),

        provisioning:
          service(
            success,
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
  "rejects client supplied creator identity fields",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileProvisioning({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/provision",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  displayName:
                    "River",

                  seshCreatorId:
                    "sesh-creator:attacker",
                }),
            },
          ),

        provisioning:
          service(
            success,
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
  const failure of [
    [
      "invalid-input",
      400,
    ],
    [
      "unauthenticated",
      401,
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
    `maps ${failure[0]} provisioning failure to HTTP ${failure[1]}`,
    async () => {
      const response =
        await handleSeshCreatorProfileProvisioning({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/provision",
              {
                method:
                  "POST",

                headers: {
                  origin:
                    "https://theriverkeptflowing.com",

                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    displayName:
                      "River",
                  }),
              },
            ),

          provisioning:
            service({
              ok:
                false,

              error: {
                code:
                  failure[0],

                message:
                  "failure",
              },
            }),
        });

      assert.equal(
        response.status,
        failure[1],
      );
    },
  );
}
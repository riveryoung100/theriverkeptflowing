import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthenticatedSeshCreatorProfileOperationService,
  SeshCreatorProfileOperationResult,
} from "../operations";

import type {
  SeshCreatorProfile,
} from "../model";

import {
  handleSeshCreatorProfileRead,
  handleSeshCreatorProfileUpdate,
} from "./creator-profile-api";

const profile:
  SeshCreatorProfile = {
    id:
      "sesh-creator:http-profile-test" as
        SeshCreatorProfile["id"],

    displayName:
      "River",

    createdAt:
      "2026-09-22T19:00:00.000Z",
  };

function operationService(
  readResult:
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    >,

  updateResult:
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    > = readResult,

  callbacks?: {
    readonly onRead?:
      () => void;

    readonly onUpdate?:
      (value: unknown) => void;
  },
): AuthenticatedSeshCreatorProfileOperationService {
  return {
    async readProfile() {
      callbacks?.onRead?.();

      return readResult;
    },

    async updateProfile(
      value:
        unknown,
    ) {
      callbacks?.onUpdate?.(
        value,
      );

      return updateResult;
    },
  };
}

async function payload(
  response:
    Response,
): Promise<
  Record<string, unknown>
> {
  return await response.json() as
    Record<string, unknown>;
}

const success:
  SeshCreatorProfileOperationResult<
    SeshCreatorProfile
  > = {
    ok:
      true,

    value:
      profile,
  };

test(
  "returns authenticated creator profile read as no-store JSON",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/profile",
          ),

        operations:
          operationService(
            success,
            success,
            {
              onRead() {
                calls +=
                  1;
              },
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

    const body =
      await payload(
        response,
      );

    assert.equal(
      body.ok,
      true,
    );
  },
);

test(
  "allows only sanitized displayName and bio through same-origin PATCH",
  async () => {
    let received:
      unknown;

    const response =
      await handleSeshCreatorProfileUpdate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/profile",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  displayName:
                    "River Young",

                  bio:
                    "Making music.",
                }),
            },
          ),

        operations:
          operationService(
            success,
            success,
            {
              onUpdate(
                value,
              ) {
                received =
                  value;
              },
            },
          ),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.deepEqual(
      received,
      {
        displayName:
          "River Young",

        bio:
          "Making music.",
      },
    );
  },
);

test(
  "rejects cross-origin profile PATCH before operation execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileUpdate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/profile",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://attacker.example",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  displayName:
                    "Attacker",
                }),
            },
          ),

        operations:
          operationService(
            success,
            success,
            {
              onUpdate() {
                calls +=
                  1;
              },
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
  const forbiddenField of [
    "handle",
    "id",
    "createdAt",
    "principalId",
    "seshCreatorId",
    "unexpected",
  ] as const
) {
  test(
    `rejects ${forbiddenField} at the profile HTTP PATCH boundary before operation execution`,
    async () => {
      let calls =
        0;

      const response =
        await handleSeshCreatorProfileUpdate({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/profile",
              {
                method:
                  "PATCH",

                headers: {
                  origin:
                    "https://theriverkeptflowing.com",

                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    [forbiddenField]:
                      "forbidden",
                  }),
              },
            ),

          operations:
            operationService(
              success,
              success,
              {
                onUpdate() {
                  calls +=
                    1;
                },
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

      const body =
        await payload(
          response,
        );

      assert.equal(
        (
          body.error as
            Record<string, unknown>
        ).code,
        "invalid-input",
      );
    },
  );
}

for (
  const invalidBody of [
    [],
    null,
    "profile",
    42,
    {},
  ]
) {
  test(
    `rejects invalid profile PATCH shape ${JSON.stringify(invalidBody)} before operation execution`,
    async () => {
      let calls =
        0;

      const response =
        await handleSeshCreatorProfileUpdate({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/profile",
              {
                method:
                  "PATCH",

                headers: {
                  origin:
                    "https://theriverkeptflowing.com",

                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    invalidBody,
                  ),
              },
            ),

          operations:
            operationService(
              success,
              success,
              {
                onUpdate() {
                  calls +=
                    1;
                },
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

for (
  const invalidTypedUpdate of [
    {
      displayName:
        42,
    },
    {
      bio:
        false,
    },
  ]
) {
  test(
    "rejects non-string profile PATCH fields before operation execution",
    async () => {
      let calls =
        0;

      const response =
        await handleSeshCreatorProfileUpdate({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/profile",
              {
                method:
                  "PATCH",

                headers: {
                  origin:
                    "https://theriverkeptflowing.com",

                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    invalidTypedUpdate,
                  ),
              },
            ),

          operations:
            operationService(
              success,
              success,
              {
                onUpdate() {
                  calls +=
                    1;
                },
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
  "rejects malformed profile PATCH JSON before operation execution",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshCreatorProfileUpdate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creator/profile",
            {
              method:
                "PATCH",

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

        operations:
          operationService(
            success,
            success,
            {
              onUpdate() {
                calls +=
                  1;
              },
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
      "unmapped",
      403,
    ],
    [
      "not-found",
      404,
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
    `maps ${failure[0]} profile operation failure to HTTP ${failure[1]}`,
    async () => {
      const operationFailure =
        {
          ok:
            false,

          error: {
            code:
              failure[0],

            message:
              "failure",
          },
        } as
          SeshCreatorProfileOperationResult<
            SeshCreatorProfile
          >;

      const readResponse =
        await handleSeshCreatorProfileRead({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/profile",
            ),

          operations:
            operationService(
              operationFailure,
            ),
        });

      assert.equal(
        readResponse.status,
        failure[1],
      );

      const patchResponse =
        await handleSeshCreatorProfileUpdate({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creator/profile",
              {
                method:
                  "PATCH",

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

          operations:
            operationService(
              success,
              operationFailure,
            ),
        });

      assert.equal(
        patchResponse.status,
        failure[1],
      );
    },
  );
}
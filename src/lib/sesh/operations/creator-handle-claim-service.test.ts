import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  parseSeshCreatorId,
} from "../identifiers";

import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandleReservationRepository,
} from "../persistence/repositories";

import {
  DefaultAuthenticatedSeshCreatorHandleClaimService,
} from "./creator-handle-claim-service";

const creatorOne =
  parseSeshCreatorId(
    "sesh-creator:one",
  );

const creatorTwo =
  parseSeshCreatorId(
    "sesh-creator:two",
  );

function resolver(
  result:
    Awaited<
      ReturnType<
        AuthenticatedSeshCreatorResolver[
          "resolve"
        ]
      >
    >,
): AuthenticatedSeshCreatorResolver {
  return {
    async resolve() {
      return result;
    },
  };
}

function authenticatedResolver(
  seshCreatorId =
    creatorOne,
): AuthenticatedSeshCreatorResolver {
  return resolver({
    ok:
      true,

    value: {
      principalId:
        "principal:test" as never,

      seshCreatorId,
    },
  });
}

function repository():
SeshCreatorHandleReservationRepository {
  const byHandle =
    new Map<
      string,
      {
        readonly normalizedHandle:
          ReturnType<
            typeof normalizeSeshCreatorHandle
          >;

        readonly creatorId:
          typeof creatorOne;

        readonly createdAt:
          string;
      }
    >();

  const byCreator =
    new Map<
      string,
      {
        readonly normalizedHandle:
          ReturnType<
            typeof normalizeSeshCreatorHandle
          >;

        readonly creatorId:
          typeof creatorOne;

        readonly createdAt:
          string;
      }
    >();

  return {
    async reserveHandle(
      value,
    ) {
      const reservation =
        value as {
          readonly normalizedHandle:
            ReturnType<
              typeof normalizeSeshCreatorHandle
            >;

          readonly creatorId:
            typeof creatorOne;

          readonly createdAt:
            string;
        };

      const existingHandle =
        byHandle.get(
          reservation.normalizedHandle,
        );

      if (
        existingHandle
      ) {
        return existingHandle.creatorId ===
          reservation.creatorId
          ? {
              ok:
                true,

              value:
                existingHandle,
            }
          : {
              ok:
                false,

              error: {
                kind:
                  "conflict",

                message:
                  "handle conflict",
              },
            };
      }

      const existingCreator =
        byCreator.get(
          reservation.creatorId,
        );

      if (
        existingCreator
      ) {
        return existingCreator.normalizedHandle ===
          reservation.normalizedHandle
          ? {
              ok:
                true,

              value:
                existingCreator,
            }
          : {
              ok:
                false,

              error: {
                kind:
                  "conflict",

                message:
                  "creator conflict",
              },
            };
      }

      byHandle.set(
        reservation.normalizedHandle,
        reservation,
      );

      byCreator.set(
        reservation.creatorId,
        reservation,
      );

      return {
        ok:
          true,

        value:
          reservation,
      };
    },

    async getByHandle(
      handle,
    ) {
      const value =
        byHandle.get(
          handle,
        );

      return value
        ? {
            ok:
              true,

            value,
          }
        : {
            ok:
              false,

            error: {
              kind:
                "not-found",

              message:
                "missing",
            },
          };
    },

    async getByCreatorId(
      creatorId,
    ) {
      const value =
        byCreator.get(
          creatorId,
        );

      return value
        ? {
            ok:
              true,

            value,
          }
        : {
            ok:
              false,

            error: {
              kind:
                "not-found",

              message:
                "missing",
            },
          };
    },

    async releaseHandle() {
      throw new Error(
        "releaseHandle must never be called by the claim service.",
      );
    },
  };
}

test(
  "normalizes and claims one canonical handle for the authenticated mapped creator",
  async () => {
    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(),

        reservations:
          repository(),

        now:
          () =>
            "2026-09-22T20:00:00.000Z",
      });

    const result =
      await service.claimHandle(
        "  River_Young  ",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      return;
    }

    assert.equal(
      result.value.normalizedHandle,
      "river_young",
    );

    assert.equal(
      result.value.creatorId,
      creatorOne,
    );
  },
);

test(
  "same creator claiming the same canonical handle is idempotent",
  async () => {
    const reservations =
      repository();

    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(),

        reservations,

        now:
          () =>
            "2026-09-22T20:00:00.000Z",
      });

    const first =
      await service.claimHandle(
        "river",
      );

    const second =
      await service.claimHandle(
        "RIVER",
      );

    assert.equal(
      first.ok,
      true,
    );

    assert.equal(
      second.ok,
      true,
    );

    if (
      !first.ok ||
      !second.ok
    ) {
      return;
    }

    assert.deepEqual(
      second.value,
      first.value,
    );
  },
);

test(
  "creator cannot claim a second different handle",
  async () => {
    const reservations =
      repository();

    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(),

        reservations,

        now:
          () =>
            "2026-09-22T20:00:00.000Z",
      });

    assert.equal(
      (
        await service.claimHandle(
          "river",
        )
      ).ok,
      true,
    );

    const result =
      await service.claimHandle(
        "young",
      );

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          code:
            "conflict",

          message:
            "This Sesh creator already owns a different handle.",
        },
      },
    );
  },
);

test(
  "different creator cannot claim an already reserved handle",
  async () => {
    const reservations =
      repository();

    const first =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(
            creatorOne,
          ),

        reservations,

        now:
          () =>
            "2026-09-22T20:00:00.000Z",
      });

    const second =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(
            creatorTwo,
          ),

        reservations,

        now:
          () =>
            "2026-09-22T20:01:00.000Z",
      });

    assert.equal(
      (
        await first.claimHandle(
          "river",
        )
      ).ok,
      true,
    );

    const result =
      await second.claimHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "conflict",
    );
  },
);

test(
  "invalid handle fails before creator resolution",
  async () => {
    let resolverCalls =
      0;

    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver: {
          async resolve() {
            resolverCalls +=
              1;

            return {
              ok:
                true,

              value: {
                principalId:
                  "principal:test" as never,

                seshCreatorId:
                  creatorOne,
              },
            };
          },
        },

        reservations:
          repository(),
      });

    const result =
      await service.claimHandle(
        "__bad",
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      resolverCalls,
      0,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "invalid-input",
    );
  },
);

for (
  const code of [
    "unauthenticated",
    "unmapped",
    "unavailable",
  ] as const
) {
  test(
    `preserves authenticated creator resolution failure ${code}`,
    async () => {
      const service =
        new DefaultAuthenticatedSeshCreatorHandleClaimService({
          creatorResolver:
            resolver({
              ok:
                false,

              error: {
                code,

                message:
                  "resolver failure",
              },
            }),

          reservations:
            repository(),
        });

      const result =
        await service.claimHandle(
          "river",
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        return;
      }

      assert.equal(
        result.error.code,
        code,
      );
    },
  );
}

test(
  "storage failure is mapped to unavailable",
  async () => {
    const reservations =
      repository();

    const failingRepository: SeshCreatorHandleReservationRepository = {
      ...reservations,

      async getByCreatorId() {
        return {
          ok:
            false,

          error: {
            kind:
              "storage",

            message:
              "storage down",
          },
        };
      },
    };

    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(),

        reservations:
          failingRepository,
      });

    const result =
      await service.claimHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "claim service exposes no release or rename operation and grants no unrelated rights",
  () => {
    const service =
      new DefaultAuthenticatedSeshCreatorHandleClaimService({
        creatorResolver:
          authenticatedResolver(),

        reservations:
          repository(),
      });

    const surface =
      service as unknown as
        Record<
          string,
          unknown
        >;

    assert.equal(
      surface.releaseHandle,
      undefined,
    );

    assert.equal(
      surface.renameHandle,
      undefined,
    );

    for (
      const forbidden of [
        "projectOwnership",
        "collaborator",
        "publishing",
        "management",
        "legal",
        "copyright",
      ]
    ) {
      assert.equal(
        surface[forbidden],
        undefined,
      );
    }
  },
);
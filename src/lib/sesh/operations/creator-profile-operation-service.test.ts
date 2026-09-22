import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../../identity/identifiers";

import type {
  AuthenticatedSeshCreatorResolutionResult,
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  createSeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorProfile,
} from "../model";

import type {
  SeshCreatorProfilePersistenceSnapshot,
  SeshPersistenceResult,
} from "../persistence/model";

import type {
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

import {
  DefaultAuthenticatedSeshCreatorProfileOperationService,
} from "./creator-profile-operation-service";

const principalId =
  createPrincipalId(
    "profile-operation-test",
  );

const creatorId =
  createSeshCreatorId(
    "profile-operation-test",
  );

const createdAt =
  "2026-09-22T19:00:00.000Z";

function resolver(
  result:
    AuthenticatedSeshCreatorResolutionResult,
): AuthenticatedSeshCreatorResolver {
  return {
    async resolve() {
      return result;
    },
  };
}

function successfulResolver():
AuthenticatedSeshCreatorResolver {
  return resolver({
    ok:
      true,

    value: {
      principalId,
      seshCreatorId:
        creatorId,
    },
  });
}

class FakeProfileRepository
implements SeshCreatorProfileRepository {
  profile:
    SeshCreatorProfile | undefined = {
      id:
        creatorId,

      displayName:
        "River",

      createdAt,
    };

  revision =
    0;

  updateCalls =
    0;

  forceConflict =
    false;

  forceMissing =
    false;

  async saveCreatorProfile(
    profile:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    const canonical =
      profile as
        SeshCreatorProfile;

    this.profile =
      canonical;

    return {
      ok:
        true,

      value:
        canonical,
    };
  }

  async getCreatorProfile(
    creatorIdInput:
      typeof creatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    if (
      this.forceMissing ||
      this.profile ===
        undefined ||
      this.profile.id !==
        creatorIdInput
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "not-found",

          message:
            "missing",
        },
      };
    }

    return {
      ok:
        true,

      value:
        this.profile,
    };
  }

  async getCreatorProfileSnapshot(
    creatorIdInput:
      typeof creatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  > {
    const profileResult =
      await this.getCreatorProfile(
        creatorIdInput,
      );

    if (
      !profileResult.ok
    ) {
      return profileResult;
    }

    return {
      ok:
        true,

      value: {
        profile:
          profileResult.value,

        revision:
          this.revision,
      },
    };
  }

  async updateCreatorProfileConditionally(
    profile:
      unknown,

    expectedRevision:
      number,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  > {
    this.updateCalls +=
      1;

    if (
      this.forceConflict ||
      expectedRevision !==
        this.revision
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "conflict",

          message:
            "stale",
        },
      };
    }

    const canonical =
      profile as
        SeshCreatorProfile;

    this.profile =
      canonical;

    this.revision +=
      1;

    return {
      ok:
        true,

      value: {
        profile:
          canonical,

        revision:
          this.revision,
      },
    };
  }

  async creatorProfileExists(
    creatorIdInput:
      typeof creatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.profile?.id ===
          creatorIdInput,
    };
  }
}

test(
  "reads only the profile of the authenticated mapped Sesh creator",
  async () => {
    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.readProfile();

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected authenticated profile read.",
      );
    }

    assert.equal(
      result.value.id,
      creatorId,
    );

    assert.equal(
      result.value.displayName,
      "River",
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
    `preserves ${code} creator-resolution failure`,
    async () => {
      const profiles =
        new FakeProfileRepository();

      const service =
        new DefaultAuthenticatedSeshCreatorProfileOperationService({
          creatorResolver:
            resolver({
              ok:
                false,

              error: {
                code,

                message:
                  code,
              },
            }),

          profiles,
        });

      const result =
        await service.readProfile();

      assert.equal(
        result.ok,
        false,
      );

      if (
        !result.ok
      ) {
        assert.equal(
          result.error.code,
          code,
        );
      }
    },
  );
}

test(
  "returns not-found when the mapped creator has no persisted profile",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.forceMissing =
      true;

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.readProfile();

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "not-found",
      );
    }
  },
);

test(
  "updates only displayName and bio while preserving id createdAt and handle",
  async () => {
    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.updateProfile({
        displayName:
          "River Young",

        bio:
          "Making music.",
      });

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected creator profile update.",
      );
    }

    assert.equal(
      result.value.id,
      creatorId,
    );

    assert.equal(
      result.value.createdAt,
      createdAt,
    );

    assert.equal(
      result.value.displayName,
      "River Young",
    );

    assert.equal(
      result.value.handle,
      undefined,
    );

    assert.equal(
      result.value.bio,
      "Making music.",
    );

    assert.equal(
      profiles.revision,
      1,
    );
  },
);

test(
  "rejects ordinary handle mutation before persistence",
  async () => {
    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.updateProfile({
        handle:
          "river",
      });

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      profiles.updateCalls,
      0,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "invalid-input",
      );
    }
  },
);
test(
  "rejects identity and lifecycle fields before persistence",
  async () => {
    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.updateProfile({
        displayName:
          "River",

        id:
          createSeshCreatorId(
            "attacker",
          ),
      });

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      profiles.updateCalls,
      0,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "invalid-input",
      );
    }
  },
);

test(
  "rejects an empty update before creator resolution or persistence",
  async () => {
    const profiles =
      new FakeProfileRepository();

    let resolveCalls =
      0;

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver: {
          async resolve() {
            resolveCalls +=
              1;

            return {
              ok:
                true,

              value: {
                principalId,
                seshCreatorId:
                  creatorId,
              },
            };
          },
        },

        profiles,
      });

    const result =
      await service.updateProfile({});

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      resolveCalls,
      0,
    );

    assert.equal(
      profiles.updateCalls,
      0,
    );
  },
);

test(
  "maps stale conditional profile persistence to conflict",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.forceConflict =
      true;

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.updateProfile({
        displayName:
          "Updated",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "conflict",
      );
    }
  },
);

test(
  "fails closed when persisted profile identity differs from authenticated creator",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.profile = {
      id:
        createSeshCreatorId(
          "different",
        ),

      displayName:
        "Different",

      createdAt,
    };

    const service =
      new DefaultAuthenticatedSeshCreatorProfileOperationService({
        creatorResolver:
          successfulResolver(),

        profiles,
      });

    const result =
      await service.readProfile();

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "not-found",
      );
    }
  },
);

test(
  "creator profile operations do not grant project collaborator publishing management legal or copyright rights",
  () => {
    const serviceSourceKeys =
      Object.keys(
        new DefaultAuthenticatedSeshCreatorProfileOperationService({
          creatorResolver:
            successfulResolver(),

          profiles:
            new FakeProfileRepository(),
        }),
      );

    assert.deepEqual(
      serviceSourceKeys,
      [],
    );
  },
);
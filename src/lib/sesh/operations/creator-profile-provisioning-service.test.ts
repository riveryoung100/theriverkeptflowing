import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../../identity/identifiers";

import {
  InMemoryPrincipalSeshCreatorMappingRepository,
} from "../../identity/sesh/memory-creator-mapping-repository";

import type {
  SessionPrincipalResolutionResult,
  SessionPrincipalResolver,
} from "../../identity/session/principal-resolver";

import {
  createSeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorProfile,
} from "../model";

import type {
  SeshPersistenceResult,
} from "../persistence/model";

import type {
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

import {
  DefaultSeshCreatorProfileProvisioningService,
} from "./creator-profile-provisioning-service";

class FakePrincipalResolver
implements SessionPrincipalResolver {
  result:
    SessionPrincipalResolutionResult;

  constructor(
    result:
      SessionPrincipalResolutionResult,
  ) {
    this.result =
      result;
  }

  async resolve():
  Promise<
    SessionPrincipalResolutionResult
  > {
    return this.result;
  }
}

class FakeCreatorProfileRepository
implements SeshCreatorProfileRepository {
  readonly profiles =
    new Map<
      SeshCreatorId,
      SeshCreatorProfile
    >();

  saveFailuresRemaining =
    0;

  saveCalls =
    0;

  async saveCreatorProfile(
    profile:
      unknown,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    this.saveCalls +=
      1;

    if (
      this.saveFailuresRemaining >
      0
    ) {
      this.saveFailuresRemaining -=
        1;

      return {
        ok:
          false,

        error: {
          kind:
            "storage",

          message:
            "simulated profile write failure",
        },
      };
    }

    const canonical =
      profile as SeshCreatorProfile;

    const existing =
      this.profiles.get(
        canonical.id,
      );

    if (
      existing !==
      undefined
    ) {
      const equal =
        existing.id ===
          canonical.id &&
        existing.displayName ===
          canonical.displayName &&
        existing.createdAt ===
          canonical.createdAt &&
        existing.handle ===
          canonical.handle &&
        existing.bio ===
          canonical.bio;

      return equal
        ? {
            ok:
              true,

            value:
              existing,
          }
        : {
            ok:
              false,

            error: {
              kind:
                "conflict",

              message:
                "profile conflict",
            },
          };
    }

    this.profiles.set(
      canonical.id,
      canonical,
    );

    return {
      ok:
        true,

      value:
        canonical,
    };
  }

  async getCreatorProfile(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    const profile =
      this.profiles.get(
        creatorId,
      );

    return profile ===
      undefined
      ? {
          ok:
            false,

          error: {
            kind:
              "not-found",

            message:
              "missing",
          },
        }
      : {
          ok:
            true,

          value:
            profile,
        };
  }

  async creatorProfileExists(
    creatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.profiles.has(
          creatorId,
        ),
    };
  }
}

const principalId =
  createPrincipalId(
    "creator-profile-provisioning-test",
  );

const createdAt =
  "2026-09-22T18:30:00.000Z";

function authenticatedPrincipalResolver():
SessionPrincipalResolver {
  return new FakePrincipalResolver({
    ok:
      true,

    value: {
      principalId,
    },
  });
}

test(
  "rejects invalid displayName before provisioning identity",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,

        now:
          () =>
            createdAt,

        createCreatorId:
          () =>
            createSeshCreatorId(
              "must-not-be-created",
            ),
      });

    const result =
      await service.provision({
        displayName:
          "   ",
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
        "invalid-input",
      );
    }

    const mapping =
      await mappings.getByPrincipalId(
        principalId,
      );

    assert.equal(
      mapping.ok,
      false,
    );

    assert.equal(
      profiles.saveCalls,
      0,
    );
  },
);

test(
  "requires an authenticated canonical principal",
  async () => {
    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          new FakePrincipalResolver({
            ok:
              false,

            error: {
              code:
                "unauthenticated",

              message:
                "Authentication is required.",
            },
          }),

        mappings:
          new InMemoryPrincipalSeshCreatorMappingRepository(),

        profiles:
          new FakeCreatorProfileRepository(),
      });

    const result =
      await service.provision({
        displayName:
          "River",
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
        "unauthenticated",
      );
    }
  },
);

test(
  "creates one canonical mapping and matching Sesh creator profile",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    const expectedCreatorId =
      createSeshCreatorId(
        "new-creator",
      );

    let creatorIdCalls =
      0;

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,

        now:
          () =>
            createdAt,

        createCreatorId:
          () => {
            creatorIdCalls +=
              1;

            return expectedCreatorId;
          },
      });

    const result =
      await service.provision({
        displayName:
          "River",
      });

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected provisioning success.",
      );
    }

    assert.equal(
      result.value.principalId,
      principalId,
    );

    assert.equal(
      result.value.seshCreatorId,
      expectedCreatorId,
    );

    assert.deepEqual(
      result.value.profile,
      {
        id:
          expectedCreatorId,

        displayName:
          "River",

        createdAt,
      },
    );

    assert.equal(
      creatorIdCalls,
      1,
    );

    const mapping =
      await mappings.getByPrincipalId(
        principalId,
      );

    assert.equal(
      mapping.ok,
      true,
    );

    if (
      mapping.ok
    ) {
      assert.equal(
        mapping.value.seshCreatorId,
        expectedCreatorId,
      );

      assert.equal(
        mapping.value.createdAt,
        createdAt,
      );
    }
  },
);

test(
  "reuses an existing mapping and creates only the missing profile",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    const existingCreatorId =
      createSeshCreatorId(
        "existing-mapping",
      );

    const savedMapping =
      await mappings.saveMapping({
        principalId,
        seshCreatorId:
          existingCreatorId,
        createdAt,
      });

    assert.equal(
      savedMapping.ok,
      true,
    );

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,

        createCreatorId:
          () => {
            throw new Error(
              "Existing mapping must be reused.",
            );
          },
      });

    const result =
      await service.provision({
        displayName:
          "River",
      });

    assert.equal(
      result.ok,
      true,
    );

    if (
      result.ok
    ) {
      assert.equal(
        result.value.seshCreatorId,
        existingCreatorId,
      );

      assert.equal(
        result.value.profile.createdAt,
        createdAt,
      );
    }
  },
);

test(
  "returns an existing profile without treating displayName as an update",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    const existingCreatorId =
      createSeshCreatorId(
        "existing-profile",
      );

    await mappings.saveMapping({
      principalId,
      seshCreatorId:
        existingCreatorId,
      createdAt,
    });

    await profiles.saveCreatorProfile({
      id:
        existingCreatorId,

      displayName:
        "Canonical Existing Name",

      createdAt,
    });

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,
      });

    const result =
      await service.provision({
        displayName:
          "Different Requested Name",
      });

    assert.equal(
      result.ok,
      true,
    );

    if (
      result.ok
    ) {
      assert.equal(
        result.value.profile.displayName,
        "Canonical Existing Name",
      );
    }

    assert.equal(
      profiles.saveCalls,
      1,
    );
  },
);

test(
  "recovers from a profile write failure by reusing the persisted mapping on retry",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    profiles.saveFailuresRemaining =
      1;

    const expectedCreatorId =
      createSeshCreatorId(
        "recoverable",
      );

    let creatorIdCalls =
      0;

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,

        now:
          () =>
            createdAt,

        createCreatorId:
          () => {
            creatorIdCalls +=
              1;

            return expectedCreatorId;
          },
      });

    const first =
      await service.provision({
        displayName:
          "River",
      });

    assert.equal(
      first.ok,
      false,
    );

    const mappingAfterFailure =
      await mappings.getByPrincipalId(
        principalId,
      );

    assert.equal(
      mappingAfterFailure.ok,
      true,
    );

    const second =
      await service.provision({
        displayName:
          "River",
      });

    assert.equal(
      second.ok,
      true,
    );

    if (
      second.ok
    ) {
      assert.equal(
        second.value.seshCreatorId,
        expectedCreatorId,
      );

      assert.equal(
        second.value.profile.createdAt,
        createdAt,
      );
    }

    assert.equal(
      creatorIdCalls,
      1,
    );
  },
);

test(
  "fails closed when mapping and persisted profile creation timestamps disagree",
  async () => {
    const mappings =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const profiles =
      new FakeCreatorProfileRepository();

    const existingCreatorId =
      createSeshCreatorId(
        "timestamp-conflict",
      );

    await mappings.saveMapping({
      principalId,
      seshCreatorId:
        existingCreatorId,
      createdAt,
    });

    await profiles.saveCreatorProfile({
      id:
        existingCreatorId,

      displayName:
        "River",

      createdAt:
        "2026-09-22T18:31:00.000Z",
    });

    const service =
      new DefaultSeshCreatorProfileProvisioningService({
        principalResolver:
          authenticatedPrincipalResolver(),

        mappings,

        profiles,
      });

    const result =
      await service.provision({
        displayName:
          "River",
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
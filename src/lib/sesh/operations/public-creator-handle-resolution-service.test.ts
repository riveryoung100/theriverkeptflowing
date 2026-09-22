import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandle,
  SeshCreatorHandleReservation,
} from "../creator-handle";

import type {
  SeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorProfile,
} from "../model";

import type {
  SeshCreatorProfilePersistenceSnapshot,
  SeshPersistenceResult,
} from "../persistence/model";

import type {
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

import {
  DefaultPublicSeshCreatorHandleResolutionService,
} from "./public-creator-handle-resolution-service";

const creatorId =
  "sesh-creator:river" as
    SeshCreatorId;

const otherCreatorId =
  "sesh-creator:other" as
    SeshCreatorId;

const createdAt =
  "2026-09-22T00:00:00.000Z";

function persistenceSuccess<T>(
  value:
    T,
): SeshPersistenceResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function persistenceFailure<T>(
  kind:
    "not-found" |
    "validation" |
    "conflict" |
    "storage",

  message:
    string,
): SeshPersistenceResult<T> {
  return {
    ok:
      false,

    error: {
      kind,
      message,
    },
  };
}

class FakeHandleReservationRepository
implements SeshCreatorHandleReservationRepository {
  reservation:
    SeshCreatorHandleReservation | undefined = {
      normalizedHandle:
        normalizeSeshCreatorHandle(
          "river",
        ),

      creatorId,

      createdAt,
    };

  failureKind:
    "not-found" |
    "validation" |
    "conflict" |
    "storage" |
    undefined;

  throwOnRead =
    false;

  readCount =
    0;

  lastHandle:
    SeshCreatorHandle | undefined;

  async reserveHandle():
  Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    throw new Error(
      "reserveHandle is outside public resolution scope.",
    );
  }

  async getByHandle(
    normalizedHandle:
      SeshCreatorHandle,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    this.readCount +=
      1;

    this.lastHandle =
      normalizedHandle;

    if (
      this.throwOnRead
    ) {
      throw new Error(
        "reservation read exploded",
      );
    }

    if (
      this.failureKind !==
        undefined
    ) {
      return persistenceFailure(
        this.failureKind,
        "reservation failure",
      );
    }

    if (
      this.reservation ===
        undefined
    ) {
      return persistenceFailure(
        "not-found",
        "reservation missing",
      );
    }

    return persistenceSuccess(
      this.reservation,
    );
  }

  async getByCreatorId():
  Promise<
    SeshPersistenceResult<
      SeshCreatorHandleReservation
    >
  > {
    throw new Error(
      "getByCreatorId is outside public resolution scope.",
    );
  }

  async releaseHandle():
  Promise<
    SeshPersistenceResult<boolean>
  > {
    throw new Error(
      "releaseHandle is outside public resolution scope.",
    );
  }
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

      bio:
        "Makes things.",
    };

  failureKind:
    "not-found" |
    "validation" |
    "conflict" |
    "storage" |
    undefined;

  throwOnRead =
    false;

  readCount =
    0;

  lastCreatorId:
    SeshCreatorId | undefined;

  async saveCreatorProfile():
  Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    throw new Error(
      "saveCreatorProfile is outside public resolution scope.",
    );
  }

  async getCreatorProfile(
    requestedCreatorId:
      SeshCreatorId,
  ): Promise<
    SeshPersistenceResult<
      SeshCreatorProfile
    >
  > {
    this.readCount +=
      1;

    this.lastCreatorId =
      requestedCreatorId;

    if (
      this.throwOnRead
    ) {
      throw new Error(
        "profile read exploded",
      );
    }

    if (
      this.failureKind !==
        undefined
    ) {
      return persistenceFailure(
        this.failureKind,
        "profile failure",
      );
    }

    if (
      this.profile ===
        undefined
    ) {
      return persistenceFailure(
        "not-found",
        "profile missing",
      );
    }

    return persistenceSuccess(
      this.profile,
    );
  }

  async getCreatorProfileSnapshot():
  Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  > {
    throw new Error(
      "getCreatorProfileSnapshot is outside public resolution scope.",
    );
  }

  async updateCreatorProfileConditionally():
  Promise<
    SeshPersistenceResult<
      SeshCreatorProfilePersistenceSnapshot
    >
  > {
    throw new Error(
      "updateCreatorProfileConditionally is outside public resolution scope.",
    );
  }

  async creatorProfileExists():
  Promise<
    SeshPersistenceResult<boolean>
  > {
    throw new Error(
      "creatorProfileExists is outside public resolution scope.",
    );
  }
}

function createService(
  reservations:
    FakeHandleReservationRepository =
      new FakeHandleReservationRepository(),

  profiles:
    FakeProfileRepository =
      new FakeProfileRepository(),
): {
  readonly service:
    DefaultPublicSeshCreatorHandleResolutionService;

  readonly reservations:
    FakeHandleReservationRepository;

  readonly profiles:
    FakeProfileRepository;
} {
  return {
    service:
      new DefaultPublicSeshCreatorHandleResolutionService({
        reservations,
        profiles,
      }),

    reservations,
    profiles,
  };
}

test(
  "normalizes requested handle and resolves a minimal public creator profile",
  async () => {
    const {
      service,
      reservations,
      profiles,
    } =
      createService();

    const result =
      await service.resolveByHandle(
        "  RIVER  ",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected successful public creator resolution.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        handle:
          "river",

        displayName:
          "River",

        bio:
          "Makes things.",
      },
    );

    assert.equal(
      reservations.lastHandle,
      "river",
    );

    assert.equal(
      profiles.lastCreatorId,
      creatorId,
    );
  },
);

test(
  "rejects invalid handle before any persistence read",
  async () => {
    const {
      service,
      reservations,
      profiles,
    } =
      createService();

    const result =
      await service.resolveByHandle(
        "ab",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected invalid-input failure.",
      );
    }

    assert.equal(
      result.error.code,
      "invalid-input",
    );

    assert.equal(
      reservations.readCount,
      0,
    );

    assert.equal(
      profiles.readCount,
      0,
    );
  },
);

test(
  "returns not-found when no canonical reservation exists",
  async () => {
    const reservations =
      new FakeHandleReservationRepository();

    reservations.reservation =
      undefined;

    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultPublicSeshCreatorHandleResolutionService({
        reservations,
        profiles,
      });

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found failure.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );

    assert.equal(
      profiles.readCount,
      0,
    );
  },
);

test(
  "maps reservation persistence failure to unavailable",
  async () => {
    const reservations =
      new FakeHandleReservationRepository();

    reservations.failureKind =
      "storage";

    const profiles =
      new FakeProfileRepository();

    const service =
      new DefaultPublicSeshCreatorHandleResolutionService({
        reservations,
        profiles,
      });

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.equal(
      profiles.readCount,
      0,
    );
  },
);

test(
  "fails closed when reservation repository throws",
  async () => {
    const reservations =
      new FakeHandleReservationRepository();

    reservations.throwOnRead =
      true;

    const {
      service,
      profiles,
    } =
      createService(
        reservations,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.equal(
      profiles.readCount,
      0,
    );
  },
);

test(
  "fails closed when reservation contradicts canonical requested handle",
  async () => {
    const reservations =
      new FakeHandleReservationRepository();

    reservations.reservation = {
      normalizedHandle:
        normalizeSeshCreatorHandle(
          "other",
        ),

      creatorId,

      createdAt,
    };

    const {
      service,
      profiles,
    } =
      createService(
        reservations,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.equal(
      profiles.readCount,
      0,
    );
  },
);

test(
  "returns not-found when canonical reservation has no public profile",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.profile =
      undefined;

    const {
      service,
    } =
      createService(
        new FakeHandleReservationRepository(),
        profiles,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found failure.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );
  },
);

test(
  "maps profile persistence failure to unavailable",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.failureKind =
      "storage";

    const {
      service,
    } =
      createService(
        new FakeHandleReservationRepository(),
        profiles,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when profile repository throws",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.throwOnRead =
      true;

    const {
      service,
    } =
      createService(
        new FakeHandleReservationRepository(),
        profiles,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when persisted profile identity contradicts reservation",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.profile = {
      id:
        otherCreatorId,

      displayName:
        "Other",

      createdAt,
    };

    const {
      service,
    } =
      createService(
        new FakeHandleReservationRepository(),
        profiles,
      );

    const result =
      await service.resolveByHandle(
        "river",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "ignores stale persisted profile handle and exposes no private identity or lifecycle fields",
  async () => {
    const profiles =
      new FakeProfileRepository();

    profiles.profile = {
      id:
        creatorId,

      displayName:
        "River Young",

      createdAt,

      handle:
        "stale-profile-handle",

      bio:
        "Public bio.",
    };

    const {
      service,
    } =
      createService(
        new FakeHandleReservationRepository(),
        profiles,
      );

    const result =
      await service.resolveByHandle(
        "RIVER",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected successful public resolution.",
      );
    }

    assert.deepEqual(
      Object.keys(
        result.value,
      ).sort(),
      [
        "bio",
        "displayName",
        "handle",
      ],
    );

    assert.equal(
      result.value.handle,
      "river",
    );

    assert.equal(
      "id" in result.value,
      false,
    );

    assert.equal(
      "createdAt" in result.value,
      false,
    );

    assert.equal(
      "principalId" in result.value,
      false,
    );

    assert.equal(
      "revision" in result.value,
      false,
    );
  },
);
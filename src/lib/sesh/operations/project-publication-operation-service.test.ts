import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshProjectPublicationRecord,
} from "../project-publication";

import type {
  SeshProjectPublicationRepository,
} from "../persistence/project-publication-repository";

import {
  DefaultAuthorizedSeshProjectPublicationOperationService,
} from "./project-publication-operation-service";

const projectId =
  createSeshMusicProjectId(
    "publication-operation-project",
  );

const creatorId =
  createSeshCreatorId(
    "publication-operation-owner",
  );

const timestamp =
  "2026-09-23T14:00:00.000Z";

function ownerAuthorizer():
SeshProjectOwnershipAuthorizer {
  return {
    async authorize(
      requestedProjectId,
      action,
    ) {
      return {
        ok: true,
        value: {
          principalId:
            "principal:test" as never,
          seshCreatorId:
            creatorId,
          projectId:
            requestedProjectId,
          action,
        },
      };
    },
  };
}

class FakePublicationRepository
implements SeshProjectPublicationRepository {
  record:
    SeshProjectPublicationRecord | null =
      null;

  async saveProjectPublication(
    record: unknown,
  ) {
    this.record =
      record as
        SeshProjectPublicationRecord;

    return {
      ok: true as const,
      value:
        this.record,
    };
  }

  async getProjectPublication() {
    if (
      this.record ===
        null
    ) {
      return {
        ok: false as const,
        error: {
          kind:
            "not-found" as const,
          message:
            "missing",
        },
      };
    }

    return {
      ok: true as const,
      value:
        this.record,
    };
  }

  async updateProjectPublication(
    record: unknown,
  ) {
    this.record =
      record as
        SeshProjectPublicationRecord;

    return {
      ok: true as const,
      value:
        this.record,
    };
  }
}

test(
  "owner can explicitly publish a project",
  async () => {
    const publications =
      new FakePublicationRepository();

    const service =
      new DefaultAuthorizedSeshProjectPublicationOperationService({
        authorizer:
          ownerAuthorizer(),
        publications,
        now:
          () => timestamp,
      });

    const result =
      await service.updatePublication(
        projectId,
        {
          state:
            "public",
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected publication success.",
      );
    }

    assert.equal(
      result.value.state,
      "public",
    );

    assert.equal(
      result.value.ownerCreatorId,
      creatorId,
    );
  },
);

test(
  "owner can explicitly return a published project to private",
  async () => {
    const publications =
      new FakePublicationRepository();

    publications.record = {
      projectId,
      ownerCreatorId:
        creatorId,
      state:
        "public",
      updatedAt:
        "2026-09-23T13:00:00.000Z",
    };

    const service =
      new DefaultAuthorizedSeshProjectPublicationOperationService({
        authorizer:
          ownerAuthorizer(),
        publications,
        now:
          () => timestamp,
      });

    const result =
      await service.updatePublication(
        projectId,
        {
          state:
            "private",
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected private update.",
      );
    }

    assert.equal(
      result.value.state,
      "private",
    );
  },
);

test(
  "rejects expanded publication mutation bodies before authorization",
  async () => {
    let calls =
      0;

    const authorizer:
      SeshProjectOwnershipAuthorizer = {
        async authorize() {
          calls += 1;

          return {
            ok: false,
            error: {
              code:
                "unavailable",
              message:
                "should not run",
            },
          };
        },
      };

    const service =
      new DefaultAuthorizedSeshProjectPublicationOperationService({
        authorizer,
        publications:
          new FakePublicationRepository(),
        now:
          () => timestamp,
      });

    for (const body of [
      {},
      [],
      null,
      "public",
      {
        state:
          "public",
        ownerCreatorId:
          creatorId,
      },
      {
        state:
          "public",
        rights:
          true,
      },
      {
        state:
          "published",
      },
    ]) {
      const result =
        await service.updatePublication(
          projectId,
          body,
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected invalid input.",
        );
      }

      assert.equal(
        result.error.code,
        "invalid-input",
      );
    }

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "uses canonical owner write authorization",
  async () => {
    let action:
      string | undefined;

    const authorizer:
      SeshProjectOwnershipAuthorizer = {
        async authorize(
          requestedProjectId,
          requestedAction,
        ) {
          action =
            requestedAction;

          return {
            ok: true,
            value: {
              principalId:
                "principal:test" as never,
              seshCreatorId:
                creatorId,
              projectId:
                requestedProjectId,
              action:
                requestedAction,
            },
          };
        },
      };

    const service =
      new DefaultAuthorizedSeshProjectPublicationOperationService({
        authorizer,
        publications:
          new FakePublicationRepository(),
        now:
          () => timestamp,
      });

    await service.updatePublication(
      projectId,
      {
        state:
          "public",
      },
    );

    assert.equal(
      action,
      "write",
    );
  },
);

test(
  "preserves authorization failures",
  async () => {
    for (const code of [
      "unauthenticated",
      "unmapped",
      "not-found",
      "forbidden",
      "unavailable",
    ] as const) {
      const service =
        new DefaultAuthorizedSeshProjectPublicationOperationService({
          authorizer: {
            async authorize() {
              return {
                ok: false,
                error: {
                  code,
                  message:
                    code,
                },
              };
            },
          },
          publications:
            new FakePublicationRepository(),
          now:
            () => timestamp,
        });

      const result =
        await service.updatePublication(
          projectId,
          {
            state:
              "public",
          },
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected authorization failure.",
        );
      }

      assert.equal(
        result.error.code,
        code,
      );
    }
  },
);

test(
  "fails closed when persisted publication owner conflicts with canonical project owner",
  async () => {
    const publications =
      new FakePublicationRepository();

    publications.record = {
      projectId,
      ownerCreatorId:
        createSeshCreatorId(
          "different-owner",
        ),
      state:
        "private",
      updatedAt:
        timestamp,
    };

    const service =
      new DefaultAuthorizedSeshProjectPublicationOperationService({
        authorizer:
          ownerAuthorizer(),
        publications,
        now:
          () => timestamp,
      });

    const result =
      await service.updatePublication(
        projectId,
        {
          state:
            "public",
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected ownership conflict.",
      );
    }

    assert.equal(
      result.error.code,
      "conflict",
    );
  },
);
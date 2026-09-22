import assert from "node:assert/strict";
import test from "node:test";

import type {
  PrincipalId,
} from "../identifiers";

import type {
  SessionPrincipalResolutionResult,
  SessionPrincipalResolver,
} from "../session/principal-resolver";

import type {
  PrincipalSeshCreatorMapping,
} from "./creator-mapping";

import type {
  PrincipalSeshCreatorMappingRepository,
  PrincipalSeshCreatorMappingRepositoryResult,
} from "./creator-mapping-repository";

import {
  DefaultAuthenticatedSeshCreatorResolver,
} from "./authenticated-creator-resolver";

const principalId =
  "principal:river" as PrincipalId;

const otherPrincipalId =
  "principal:other" as PrincipalId;

const mapping:
  PrincipalSeshCreatorMapping = {
    principalId,
    seshCreatorId:
      "sesh-creator:river",
    createdAt:
      "2026-09-22T15:00:00.000Z",
  };

function principalResolver(
  result:
    SessionPrincipalResolutionResult,
): SessionPrincipalResolver {
  return {
    async resolve() {
      return result;
    },
  };
}

function repositoryWithLookup(
  lookup:
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >,
): PrincipalSeshCreatorMappingRepository {
  return {
    async saveMapping(
      candidate,
    ) {
      return {
        ok:
          true,

        value:
          candidate,
      };
    },

    async getByPrincipalId() {
      return lookup;
    },

    async getBySeshCreatorId() {
      return {
        ok:
          false,

        error: {
          kind:
            "not-found",

          message:
            "Not used by resolver.",
        },
      };
    },

    async mappingExistsForPrincipal() {
      return {
        ok:
          true,

        value:
          lookup.ok,
      };
    },

    async mappingExistsForCreator() {
      return {
        ok:
          true,

        value:
          false,
      };
    },
  };
}

test(
  "resolves an authenticated PrincipalId through the canonical mapping only",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              true,

            value: {
              principalId,
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              true,

            value:
              mapping,
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected authenticated Sesh creator resolution.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        principalId:
          "principal:river",

        seshCreatorId:
          "sesh-creator:river",
      },
    );

    assert.deepEqual(
      Object.keys(
        result.value,
      ),
      [
        "principalId",
        "seshCreatorId",
      ],
    );
  },
);

test(
  "preserves unauthenticated state without attempting creator inference",
  async () => {
    let mappingLookupCount =
      0;

    const mappings:
      PrincipalSeshCreatorMappingRepository = {
        async saveMapping(
          candidate,
        ) {
          return {
            ok:
              true,

            value:
              candidate,
          };
        },

        async getByPrincipalId() {
          mappingLookupCount +=
            1;

          throw new Error(
            "Mapping lookup must not run for an unauthenticated principal.",
          );
        },

        async getBySeshCreatorId() {
          throw new Error(
            "Unexpected reverse lookup.",
          );
        },

        async mappingExistsForPrincipal() {
          throw new Error(
            "Unexpected existence lookup.",
          );
        },

        async mappingExistsForCreator() {
          throw new Error(
            "Unexpected existence lookup.",
          );
        },
      };

    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              false,

            error: {
              code:
                "unauthenticated",

              message:
                "Authentication is required.",
            },
          }),

        mappings,
      });

    const result =
      await resolver.resolve();

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          code:
            "unauthenticated",

          message:
            "Authentication is required.",
        },
      },
    );

    assert.equal(
      mappingLookupCount,
      0,
    );
  },
);

test(
  "preserves principal resolution infrastructure failure as unavailable",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              false,

            error: {
              code:
                "unavailable",

              message:
                "Authentication is temporarily unavailable.",
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              true,

            value:
              mapping,
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "returns unmapped when an authenticated principal has no explicit Sesh creator mapping",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              true,

            value: {
              principalId,
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              false,

            error: {
              kind:
                "not-found",

              message:
                "No Sesh creator mapping exists for the PrincipalId.",
            },
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unmapped result.",
      );
    }

    assert.equal(
      result.error.code,
      "unmapped",
    );
  },
);

test(
  "maps mapping-repository operational failures to unavailable",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              true,

            value: {
              principalId,
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              false,

            error: {
              kind:
                "storage",

              message:
                "Mapping storage unavailable.",
            },
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when the mapping repository returns a different PrincipalId",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              true,

            value: {
              principalId,
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              true,

            value: {
              ...mapping,

              principalId:
                otherPrincipalId,
            },
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when a repository returns malformed Sesh creator identity",
  async () => {
    const resolver =
      new DefaultAuthenticatedSeshCreatorResolver({
        principalResolver:
          principalResolver({
            ok:
              true,

            value: {
              principalId,
            },
          }),

        mappings:
          repositoryWithLookup({
            ok:
              true,

            value: {
              principalId,

              seshCreatorId:
                "wrong:creator" as PrincipalSeshCreatorMapping["seshCreatorId"],

              createdAt:
                mapping.createdAt,
            },
          }),
      });

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

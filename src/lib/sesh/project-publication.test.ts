import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "./identifiers";

import {
  SESH_PROJECT_PUBLICATION_STATES,
  isSeshProjectPublic,
  isSeshProjectPublicationState,
  validateSeshProjectPublicationRecord,
} from "./project-publication";

const projectId =
  createSeshMusicProjectId(
    "publication-project",
  );

const ownerCreatorId =
  createSeshCreatorId(
    "publication-owner",
  );

const updatedAt =
  "2026-09-22T22:00:00.000Z";

test(
  "locks private and public as the only project presentation states",
  () => {
    assert.deepEqual(
      SESH_PROJECT_PUBLICATION_STATES,
      [
        "private",
        "public",
      ],
    );

    assert.equal(
      isSeshProjectPublicationState(
        "private",
      ),
      true,
    );

    assert.equal(
      isSeshProjectPublicationState(
        "public",
      ),
      true,
    );

    for (
      const invalid of [
        "published",
        "draft",
        "unlisted",
        "release",
        "released",
        "featured",
        "",
        null,
        true,
      ]
    ) {
      assert.equal(
        isSeshProjectPublicationState(
          invalid,
        ),
        false,
      );
    }
  },
);

test(
  "validates a canonical private project presentation record",
  () => {
    const record =
      validateSeshProjectPublicationRecord({
        projectId,
        ownerCreatorId,
        state:
          "private",
        updatedAt,
      });

    assert.deepEqual(
      record,
      {
        projectId,
        ownerCreatorId,
        state:
          "private",
        updatedAt,
      },
    );

    assert.equal(
      isSeshProjectPublic(
        record,
      ),
      false,
    );
  },
);

test(
  "validates an explicit public project presentation record",
  () => {
    const record =
      validateSeshProjectPublicationRecord({
        projectId,
        ownerCreatorId,
        state:
          "public",
        updatedAt,
      });

    assert.equal(
      isSeshProjectPublic(
        record,
      ),
      true,
    );
  },
);

test(
  "rejects malformed project identity",
  () => {
    assert.throws(
      () =>
        validateSeshProjectPublicationRecord({
          projectId:
            "project:wrong",
          ownerCreatorId,
          state:
            "private",
          updatedAt,
        }),
    );
  },
);

test(
  "rejects malformed owner creator identity",
  () => {
    assert.throws(
      () =>
        validateSeshProjectPublicationRecord({
          projectId,
          ownerCreatorId:
            "creator:wrong",
          state:
            "private",
          updatedAt,
        }),
    );
  },
);

test(
  "rejects unsupported publication state",
  () => {
    assert.throws(
      () =>
        validateSeshProjectPublicationRecord({
          projectId,
          ownerCreatorId,
          state:
            "published",
          updatedAt,
        }),
      /private or public/,
    );
  },
);

test(
  "rejects non-canonical publication timestamps",
  () => {
    for (
      const timestamp of [
        "2026-09-22",
        "2026-09-22T22:00:00Z",
        "not-a-date",
        "",
        42,
      ]
    ) {
      assert.throws(
        () =>
          validateSeshProjectPublicationRecord({
            projectId,
            ownerCreatorId,
            state:
              "private",
            updatedAt:
              timestamp,
          }),
      );
    }
  },
);

test(
  "rejects rights ownership and lifecycle expansion fields",
  () => {
    for (
      const extraField of [
        "copyrightOwner",
        "masterOwner",
        "compositionOwner",
        "publishingRights",
        "distributionRights",
        "managementAuthority",
        "royaltyShare",
        "license",
        "revenueShare",
        "collaboratorRights",
        "publishedAt",
        "releasedAt",
      ]
    ) {
      assert.throws(
        () =>
          validateSeshProjectPublicationRecord({
            projectId,
            ownerCreatorId,
            state:
              "public",
            updatedAt,
            [extraField]:
              "not-authorized",
          }),
        /unsupported fields/,
      );
    }
  },
);

test(
  "public presentation state contains no project payload or private media metadata",
  () => {
    const record =
      validateSeshProjectPublicationRecord({
        projectId,
        ownerCreatorId,
        state:
          "public",
        updatedAt,
      });

    assert.deepEqual(
      Object.keys(
        record,
      ).sort(),
      [
        "ownerCreatorId",
        "projectId",
        "state",
        "updatedAt",
      ],
    );

    assert.equal(
      "title" in record,
      false,
    );

    assert.equal(
      "trackIds" in record,
      false,
    );

    assert.equal(
      "audioAssetIds" in record,
      false,
    );

    assert.equal(
      "storageReference" in record,
      false,
    );
  },
);
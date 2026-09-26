import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

const sourcePath =
  new URL(
    "./track-reorder-api.ts",
    import.meta.url,
  );

test(
  "reorder runtime composes canonical identity ownership and D1 track persistence",
  async () => {
    const source =
      await readFile(
        sourcePath,
        "utf8",
      );

    for (
      const required of [
        "DefaultSessionPrincipalResolver",
        "DefaultAuthenticatedSeshCreatorResolver",
        "DefaultSeshProjectOwnershipAuthorizer",
        "D1SeshProjectRepository",
        "D1SeshTrackRepository",
        "DefaultAuthorizedSeshTrackReorderOperationService",
        "RIVER_IDENTITY_DB",
        "SESH_DB",
        "reorderPersistence:",
        "trackRepository",
      ]
    ) {
      assert.equal(
        source.includes(
          required,
        ),
        true,
        `missing runtime invariant: ${required}`,
      );
    }
  },
);

test(
  "reorder runtime adds no audio public collaboration or rights authority",
  async () => {
    const source =
      await readFile(
        sourcePath,
        "utf8",
      );

    for (
      const forbidden of [
        "SESH_AUDIO",
        "putObject(",
        "getObject(",
        "deleteObject(",
        "publicUrl",
        "signedUrl",
        "collaborator",
        "publishingRights",
        "managementRights",
        "masterRights",
        "royaltyShare",
        "ownershipTransfer",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden runtime authority: ${forbidden}`,
      );
    }
  },
);
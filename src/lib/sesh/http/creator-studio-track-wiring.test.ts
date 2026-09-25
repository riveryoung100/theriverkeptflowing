import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

const studioPagePath =
  new URL(
    "../../../pages/sesh/studio/index.astro",
    import.meta.url,
  );

async function source():
Promise<string> {
  return readFile(
    studioPagePath,
    "utf8",
  );
}

test(
  "Studio renders private project track creation and listing controls",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /id="studio-track-form"/s,
    );

    assert.match(
      value,
      /id="studio-track-project"/s,
    );

    assert.match(
      value,
      /id="studio-track-name"/s,
    );

    assert.match(
      value,
      /id="studio-track-list"/s,
    );

    assert.match(
      value,
      /id="studio-track-status"/s,
    );
  },
);

test(
  "Studio loads tracks through the authenticated project track collection API",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const loadProjectTracks\s*=\s*async/s,
    );

    assert.match(
      value,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/tracks`/s,
    );

    assert.match(
      value,
      /renderTracks\(\s*tracksFrom\(\s*body,\s*\),\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /trackProject\.addEventListener\(\s*"change"/s,
    );
  },
);

test(
  "Studio creates tracks through POST with exact name input",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const createProjectTrack\s*=/s,
    );

    assert.match(
      value,
      /method:\s*"POST"/s,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*name,\s*\}\)/s,
    );

    assert.match(
      value,
      /await createProjectTrack\(\s*projectId,\s*name,\s*\)/s,
    );
  },
);

test(
  "Studio renames tracks through PATCH with exact name input",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const renameProjectTrack\s*=/s,
    );

    assert.match(
      value,
      /method:\s*"PATCH"/s,
    );

    assert.match(
      value,
      /window\.prompt\(\s*"Rename track"/s,
    );

    assert.match(
      value,
      /requestedName\.trim\(\)/s,
    );

    assert.match(
      value,
      /name\.length\s*>\s*120/s,
    );

    assert.match(
      value,
      /await renameProjectTrack\(\s*projectId,\s*track\.id,\s*name,\s*\)/s,
    );
  },
);

test(
  "Studio deletes tracks through DELETE while retaining uploaded audio",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const deleteProjectTrack\s*=/s,
    );

    assert.match(
      value,
      /method:\s*"DELETE"/s,
    );

    assert.match(
      value,
      /It does not delete uploaded audio\./s,
    );

    assert.match(
      value,
      /await deleteProjectTrack\(\s*projectId,\s*track\.id,\s*\)/s,
    );
  },
);

test(
  "Studio refreshes tracks after create rename and delete",
  async () => {
    const value =
      await source();

    const matches =
      value.match(
        /await loadProjectTracks\(\s*projectId,\s*\)/gs,
      ) ??
      [];

    assert.ok(
      matches.length >=
        3,
    );
  },
);

test(
  "Studio track UI exposes no direct persistence media rights or identity authority",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /renderTrackProjectOptions/s,
    );

    assert.match(
      value,
      /option\.textContent\s*=\s*project\.title/s,
    );

    for (
      const forbidden of [
        "expectedRevision:",
        "ownerCreatorId:",
        "principalId:",
        "seshCreatorId:",
        "storageReference:",
        "r2Key:",
        "SESH_AUDIO",
        "SESH_DB",
        "RIVER_IDENTITY_DB",
        "attachAudio",
        "detachAudio",
        "audioAssetIds:",
        "publishingRights:",
        "managementRights:",
        "masterRights:",
        "royaltyShare:",
        "ownershipTransfer:",
      ]
    ) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);
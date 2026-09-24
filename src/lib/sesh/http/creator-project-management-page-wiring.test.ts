import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

const projectPagePath =
  new URL(
    "../../../pages/sesh/studio/projects/[projectId].astro",
    import.meta.url,
  );

const studioPagePath =
  new URL(
    "../../../pages/sesh/studio/index.astro",
    import.meta.url,
  );

const configPath =
  new URL(
    "../../../../astro.config.mjs",
    import.meta.url,
  );

async function readProjectPage():
Promise<string> {
  return readFile(
    projectPagePath,
    "utf8",
  );
}

test(
  "creator project manager is SSR no-store and noindex",
  async () => {
    const source =
      await readProjectPage();

    assert.match(
      source,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      source,
      /"cache-control",\s*"no-store"/s,
    );

    assert.match(
      source,
      /noindex=\{true\}/s,
    );
  },
);

test(
  "Studio creates human management links without rendering the project id as link text",
  async () => {
    const source =
      await readFile(
        studioPagePath,
        "utf8",
      );

    assert.match(
      source,
      /manage\.textContent\s*=\s*"Manage project"/s,
    );

    assert.match(
      source,
      /\/sesh\/studio\/projects\/\$\{encodeURIComponent\(\s*project\.id,/s,
    );

    assert.doesNotMatch(
      source,
      /manage\.textContent\s*=\s*project\.id/s,
    );
  },
);

test(
  "project manager reuses owner-authorized item mutation endpoints",
  async () => {
    const source =
      await readProjectPage();

    assert.match(
      source,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(/s,
    );

    assert.match(
      source,
      /method:\s*"PATCH"/s,
    );

    assert.match(
      source,
      /method:\s*"DELETE"/s,
    );

    assert.match(
      source,
      /JSON\.stringify\(\{\s*title,/s,
    );

    assert.doesNotMatch(
      source,
      /expectedRevision\s*:/s,
    );
  },
);

test(
  "project publication sends only explicit presentation state",
  async () => {
    const source =
      await readProjectPage();

    assert.match(
      source,
      /\$\{projectEndpoint\}\/publication/s,
    );

    assert.match(
      source,
      /JSON\.stringify\(\{\s*state,/s,
    );

    assert.match(
      source,
      /updatePublication\(\s*"public",/s,
    );

    assert.match(
      source,
      /updatePublication\(\s*"private",/s,
    );
  },
);

test(
  "project visibility uses only the existing anonymous public presentation read",
  async () => {
    const source =
      await readProjectPage();

    assert.match(
      source,
      /\/api\/sesh\/projects\/public\/\$\{encodeURIComponent\(/s,
    );

    assert.match(
      source,
      /response\.status\s*===\s*200/s,
    );

    assert.match(
      source,
      /response\.status\s*===\s*404/s,
    );
  },
);

test(
  "project manager does not create browser persistence identity or rights authority",
  async () => {
    const source =
      await readProjectPage();

    for (
      const forbidden of [
        "RIVER_IDENTITY_DB",
        "SESH_DB",
        "SESH_AUDIO",
        "RIVER_CRM_DB",
        "RIVER_COMMERCE_DB",
        "expectedRevision:",
        "ownerCreatorId:",
        "principalId:",
        "seshCreatorId:",
        "publishingRights:",
        "managementRights:",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  "project manager explicitly separates presentation from ownership and rights",
  async () => {
    const source =
      await readProjectPage();

    assert.match(
      source,
      /does not transfer ownership,/s,
    );

    assert.match(
      source,
      /master rights,/s,
    );

    assert.match(
      source,
      /publishing rights,/s,
    );

    assert.match(
      source,
      /management rights,/s,
    );

    assert.match(
      source,
      /royalties,/s,
    );
  },
);

test(
  "all private Sesh Studio routes are excluded from sitemap generation",
  async () => {
    const config =
      await readFile(
        configPath,
        "utf8",
      );

    assert.match(
      config,
      /!page\.startsWith\(\s*"https:\/\/theriverkeptflowing\.com\/sesh\/studio\/"\s*\)/s,
    );
  },
);

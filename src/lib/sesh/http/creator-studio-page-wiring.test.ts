import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

const pagePath =
  new URL(
    "../../../pages/sesh/studio/index.astro",
    import.meta.url,
  );

async function source():
Promise<string> {
  return readFile(
    pagePath,
    "utf8",
  );
}

test(
  "creator Studio is server rendered no-store and noindex",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      value,
      /Astro\.response\.headers\.set\(\s*"cache-control",\s*"no-store"/s,
    );

    assert.match(
      value,
      /noindex=\{true\}/s,
    );

    assert.match(
      value,
      /canonical=\{canonical\}/s,
    );
  },
);

test(
  "creator Studio uses canonical Principal login and logout HTTP boundaries",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /\/api\/identity\/login/,
    );

    assert.match(
      value,
      /\/api\/identity\/logout/,
    );

    assert.match(
      value,
      /credentials:\s*"same-origin"/s,
    );
  },
);

test(
  "creator Studio initializes creator identity only through explicit provisioning",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /\/api\/sesh\/creator\/provision/,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*displayName,/s,
    );

    assert.doesNotMatch(
      value,
      /principalId\s*:/s,
    );

    assert.doesNotMatch(
      value,
      /seshCreatorId\s*:/s,
    );
  },
);

test(
  "creator Studio edits only public-facing profile fields",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /\/api\/sesh\/creator\/profile/,
    );

    assert.match(
      value,
      /displayName/,
    );

    assert.match(
      value,
      /bio/,
    );

    assert.doesNotMatch(
      value,
      /ownerCreatorId\s*:/s,
    );

    assert.doesNotMatch(
      value,
      /createdAt\s*:/s,
    );
  },
);

test(
  "creator Studio claims canonical handle through the dedicated handle boundary",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /\/api\/sesh\/creator\/handle/,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*handle,/s,
    );

    assert.match(
      value,
      /\/sesh\/\$\{encodeURIComponent\(/s,
    );
  },
);

test(
  "creator Studio reads and creates projects through the authenticated collection API",
  async () => {
    const value =
      await source();

    const projectEndpointMatches =
      value.match(
        /"\/api\/sesh\/projects"/g,
      );

    assert.ok(
      projectEndpointMatches,
    );

    assert.ok(
      projectEndpointMatches.length >=
        2,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*title,/s,
    );
  },
);

test(
  "creator Studio does not expose internal identity or persistence metadata as UI",
  async () => {
    const value =
      await source();

    assert.doesNotMatch(
      value,
      />\s*PrincipalId\s*</s,
    );

    assert.doesNotMatch(
      value,
      />\s*SeshCreatorId\s*</s,
    );

    assert.doesNotMatch(
      value,
      />\s*ownerCreatorId\s*</s,
    );

    assert.doesNotMatch(
      value,
      />\s*revision\s*</s,
    );

    assert.doesNotMatch(
      value,
      /project\.id\s*\}/s,
    );
  },
);

test(
  "creator Studio does not add publication media rights or management controls",
  async () => {
    const value =
      await source();

    assert.doesNotMatch(
      value,
      /\/publication"/,
    );

    assert.doesNotMatch(
      value,
      /SESH_AUDIO/,
    );

    assert.doesNotMatch(
      value,
      /RIVER_IDENTITY_DB/,
    );

    assert.doesNotMatch(
      value,
      /RIVER_CRM_DB/,
    );

    assert.doesNotMatch(
      value,
      /RIVER_COMMERCE_DB/,
    );

    assert.doesNotMatch(
      value,
      /publishingRights\s*:/s,
    );

    assert.doesNotMatch(
      value,
      /managementRights\s*:/s,
    );
  },
);
test(
  "creator Studio stays excluded from the public sitemap",
  async () => {
    const configPath =
      new URL(
        "../../../../astro.config.mjs",
        import.meta.url,
      );

    const config =
      await readFile(
        configPath,
        "utf8",
      );

    assert.match(
      config,
      /sitemap\(\{\s*filter:\s*\(page\)\s*=>\s*!page\.startsWith\(\s*"https:\/\/theriverkeptflowing\.com\/sesh\/studio\/"\s*\)/s,
    );
  },
);

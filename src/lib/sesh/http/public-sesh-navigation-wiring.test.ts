import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const navbar =
  readFileSync(
    new URL(
      "../../../components/Navbar.astro",
      import.meta.url,
    ),
    "utf8",
  );

const footer =
  readFileSync(
    new URL(
      "../../../components/Footer.astro",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Sesh is intentionally exposed through the shared primary navigation model",
  () => {
    assert.match(
      navbar,
      /const primaryLinks\s*=\s*\[/s,
    );

    assert.match(
      navbar,
      /href:\s*"\/sesh\/"/s,
    );

    assert.match(
      navbar,
      /label:\s*"Sesh"/s,
    );

    assert.match(
      navbar,
      /primaryLinks\.map\(\(link\)\s*=>/s,
    );

    assert.equal(
      (
        navbar.match(
          /href:\s*"\/sesh\/"/g,
        ) ?? []
      ).length,
      1,
    );
  },
);

test(
  "shared primary navigation continues to drive both desktop and mobile navigation",
  () => {
    const primaryLinkMapCount =
      (
        navbar.match(
          /primaryLinks\.map\(\(link\)\s*=>/g,
        ) ?? []
      ).length;

    assert.equal(
      primaryLinkMapCount,
      2,
    );

    assert.match(
      navbar,
      /aria-label="Primary navigation"/s,
    );

    assert.match(
      navbar,
      /aria-label="Mobile navigation"/s,
    );
  },
);

test(
  "footer contains one direct human Sesh entrypoint",
  () => {
    assert.match(
      footer,
      /<a\s+href="\/sesh\/"\s*>\s*Sesh\s*<\/a>/s,
    );

    assert.equal(
      (
        footer.match(
          /href="\/sesh\/"/g,
        ) ?? []
      ).length,
      1,
    );
  },
);

test(
  "public navigation points to the human discovery page rather than Sesh APIs or internal identity surfaces",
  () => {
    for (
      const source of [
        navbar,
        footer,
      ]
    ) {
      assert.doesNotMatch(
        source,
        /\/api\/sesh\//s,
      );

      assert.doesNotMatch(
        source,
        /RIVER_IDENTITY_DB/s,
      );

      assert.doesNotMatch(
        source,
        /SESH_DB/s,
      );

      assert.doesNotMatch(
        source,
        /SESH_AUDIO/s,
      );

      assert.doesNotMatch(
        source,
        /\bPrincipalId\b/s,
      );

      assert.doesNotMatch(
        source,
        /\bSeshCreatorId\b/s,
      );
    }
  },
);

test(
  "navigation entrypoint introduces no mutation media delivery or rights behavior",
  () => {
    const combined =
      `${navbar}\n${footer}`;

    assert.doesNotMatch(
      combined,
      /\bPATCH\b/s,
    );

    assert.doesNotMatch(
      combined,
      /\bPOST\b/s,
    );

    assert.doesNotMatch(
      combined,
      /\bDELETE\b/s,
    );

    assert.doesNotMatch(
      combined,
      /\bcopyright\b/i,
    );

    assert.doesNotMatch(
      combined,
      /\blicensing\b/i,
    );

    assert.doesNotMatch(
      combined,
      /\broyalty\b/i,
    );

    assert.doesNotMatch(
      combined,
      /\bmanagement\b/i,
    );
  },
);
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";
import {
    fileURLToPath
} from "node:url";

const crmPath =
    fileURLToPath(
        new URL(
            "../../pages/river-os/crm.astro",
            import.meta.url
        )
    );

test(
    "private CRM relationship search stays inside the canonical CRM workspace and composes with insurance queues",
    async () => {
        const source =
            await readFile(
                crmPath,
                "utf8"
            );

        assert.match(
            source,
            /name="search"/
        );

        assert.match(
            source,
            /crmPersistence\.searchRelationships/
        );

        assert.match(
            source,
            /searchedRelationshipIds/
        );

        assert.match(
            source,
            /params\.set\([\s\S]*"insuranceQueue"/
        );

        assert.match(
            source,
            /params\.set\([\s\S]*"search"/
        );

        assert.doesNotMatch(
            source,
            /round-robin|leadScore|priorityScore|Telnyx/
        );
    }
);

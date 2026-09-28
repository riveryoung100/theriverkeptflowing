import assert from "node:assert/strict";
import {
    readFileSync
} from "node:fs";
import test from "node:test";


const routeSource =
    readFileSync(
        new URL(
            "../../../pages/api/insurance/quote-request.ts",
            import.meta.url
        ),
        "utf8"
    );

test(
    "insurance quote route exposes POST through canonical HTTP and D1 boundaries",
    () => {
        assert.match(
            routeSource,
            /export const POST:/
        );

        assert.match(
            routeSource,
            /createInsuranceQuoteRequestApi/
        );

        assert.match(
            routeSource,
            /createD1InsuranceQuoteRequestPersistence/
        );

        assert.match(
            routeSource,
            /RIVER_CRM_DB/
        );
    }
);

test(
    "insurance quote route is public ingress and does not reuse River OS private actions",
    () => {
        assert.doesNotMatch(
            routeSource,
            /river-os\/actions/
        );

        assert.doesNotMatch(
            routeSource,
            /requireRiverOs/
        );

        assert.doesNotMatch(
            routeSource,
            /Astro\.redirect/
        );
    }
);

test(
    "insurance quote route does not reference Sesh infrastructure",
    () => {
        assert.doesNotMatch(
            routeSource,
            /SESH_DB/
        );

        assert.doesNotMatch(
            routeSource,
            /SESH_AUDIO/
        );

        assert.doesNotMatch(
            routeSource,
            /\/sesh\//
        );
    }
);

test(
    "insurance quote route generates server timestamp and UUID dependencies",
    () => {
        assert.match(
            routeSource,
            /new Date\(\)/
        );

        assert.match(
            routeSource,
            /crypto\s*\.\s*randomUUID/
        );
    }
);

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const routePath =
    "src/pages/river-os/actions/insurance-contact.ts";

const source =
    fs.readFileSync(
        routePath,
        "utf8"
    );


test(
    "private contact route is POST-only and non-prerendered",
    () => {
        assert.match(
            source,
            /export const prerender\s*=\s*false/
        );

        assert.match(
            source,
            /export const POST/
        );

        assert.doesNotMatch(
            source,
            /export const GET/
        );
    }
);


test(
    "private contact route uses the canonical same-origin write guard",
    () => {
        assert.match(
            source,
            /isSameOriginRiverCrmWriteRequest/
        );

        assert.match(
            source,
            /403/
        );
    }
);


test(
    "private contact route requires the canonical River CRM D1 binding",
    () => {
        assert.match(
            source,
            /RIVER_CRM_DB/
        );

        assert.match(
            source,
            /createD1RiverCrmPersistence/
        );

        assert.match(
            source,
            /\.get\s*\(\s*contactRequest\.relationshipId\s*\)/s
        );
    }
);


test(
    "private contact route parses the canonical provider-neutral request contract",
    () => {
        assert.match(
            source,
            /buildInsurancePrivateContactRequestFromForm/
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']phone["']/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']email["']/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']destination["']/s
        );
    }
);


test(
    "private contact route fails closed before provider composition exists",
    () => {
        assert.match(
            source,
            /Insurance contact provider is not configured\./
        );

        assert.match(
            source,
            /503/
        );

        assert.doesNotMatch(
            source,
            /createInsuranceContactOrchestrationService/
        );

        assert.doesNotMatch(
            source,
            /\.requestContact\s*\(/
        );
    }
);


test(
    "private contact route contains no provider SDK or direct network transport",
    () => {
        assert.doesNotMatch(
            source,
            /Twilio|RingCentral|OpenPhone|Telnyx|Plivo|Vonage/i
        );

        assert.doesNotMatch(
            source,
            /\bfetch\s*\(/
        );

        assert.doesNotMatch(
            source,
            /axios/i
        );
    }
);

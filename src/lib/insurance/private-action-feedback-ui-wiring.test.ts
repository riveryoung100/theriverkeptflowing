import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function crmSource():
    Promise<string> {

    return await readFile(
        new URL(
            "../../pages/river-os/crm.astro",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "INS-007L resolves private action feedback from canonical CRM search params",
    async () => {
        const source =
            await crmSource();

        assert.match(
            source,
            /resolveInsurancePrivateActionFeedback/
        );

        assert.match(
            source,
            /Astro\.url\.searchParams/
        );

        assert.match(
            source,
            /privateActionFeedback/
        );
    }
);


test(
    "INS-007L renders passive accessible feedback beneath the CRM hero",
    async () => {
        const source =
            await crmSource();

        const heroIndex =
            source.indexOf(
                '<section class="crm-hero">'
            );

        const feedbackIndex =
            source.indexOf(
                'class="private-action-feedback"'
            );

        const summaryIndex =
            source.indexOf(
                'class="summary-grid"'
            );

        assert.ok(heroIndex >= 0);
        assert.ok(feedbackIndex > heroIndex);
        assert.ok(summaryIndex > feedbackIndex);

        assert.match(source,/role="status"/);
        assert.match(source,/aria-live="polite"/);
        assert.match(source,/privateActionFeedback\.message/);
    }
);


test(
    "INS-007L feedback UI adds no mutation provider routing scoring or second CRM authority",
    async () => {
        const source =
            await crmSource();

        for(const forbidden of [
            "/river-os/actions/insurance-appointment?feedback",
            "appointment-cleared",
            "Telnyx",
            "round-robin",
            "leadScore",
            "priorityScore"
        ]){
            assert.equal(
                source.toLowerCase().includes(
                    forbidden.toLowerCase()
                ),
                false
            );
        }
    }
);

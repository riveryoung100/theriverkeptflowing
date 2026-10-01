import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function routeSource():
    Promise<string> {

    return await readFile(
        new URL(
            "../../pages/river-os/actions/insurance-follow-up.ts",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "private follow-up action reuses River OS same-origin protection and RIVER_CRM_DB",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /isSameOriginRiverCrmWriteRequest/
        );

        assert.match(
            source,
            /RIVER_CRM_DB/
        );

        assert.match(
            source,
            /403/
        );

        assert.match(
            source,
            /503/
        );

        assert.match(
            source,
            /cache-control/
        );

        assert.match(
            source,
            /no-store/
        );
    }
);


test(
    "private follow-up action parses only the dedicated follow-up transport",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /buildInsurancePrivateFollowUpRequestFromForm/
        );

        assert.doesNotMatch(
            source,
            /buildRiverCrmRelationshipFromForm/
        );

        assert.doesNotMatch(
            source,
            /buildInsurancePrivateOperatingStateRequestFromForm/
        );
    }
);


test(
    "private follow-up action loads the canonical relationship before execution",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /createD1RiverCrmPersistence/
        );

        assert.match(
            source,
            /\.get\(\s*target\.relationshipId\s*\)/s
        );

        assert.match(
            source,
            /relationship === undefined/
        );

        assert.match(
            source,
            /River CRM relationship was not found/
        );

        assert.match(
            source,
            /404/
        );
    }
);


test(
    "private follow-up action delegates policy and persistence to canonical INS-007D executor",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /createD1InsuranceLeadFollowUpExecutor/
        );

        assert.match(
            source,
            /\.execute\(\{/
        );

        assert.match(
            source,
            /relationship,/
        );

        assert.match(
            source,
            /nextFollowUpAt:\s*target\.nextFollowUpAt/s
        );

        assert.match(
            source,
            /occurredAt:\s*new Date\(\)\s*\.toISOString\(\)/s
        );

        assert.doesNotMatch(
            source,
            /UPDATE river_crm_/
        );

        assert.doesNotMatch(
            source,
            /INSERT INTO river_crm_/
        );

        assert.doesNotMatch(
            source,
            /DELETE FROM river_crm_/
        );
    }
);


test(
    "private follow-up action maps stale optimistic-concurrency writes to conflict",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /InsuranceLeadFollowUpConflictError/
        );

        assert.match(
            source,
            /instanceof\s+InsuranceLeadFollowUpConflictError/s
        );

        assert.match(
            source,
            /409/
        );
    }
);


test(
    "private follow-up action maps invalid planner state separately from infrastructure failure",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /error instanceof TypeError/
        );

        assert.match(
            source,
            /400/
        );

        assert.match(
            source,
            /Insurance lead follow-up could not be saved/
        );

        assert.match(
            source,
            /503/
        );
    }
);


test(
    "private follow-up action redirects schedule clear or no-op outcome back to the canonical CRM",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /\/river-os\/crm\?followUp=\$\{result\.outcome\}/
        );

        assert.match(
            source,
            /303/
        );
    }
);


test(
    "private follow-up action keeps persistence timestamp server-owned",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /new Date\(\)\s*\.toISOString\(\)/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\(\s*["']occurredAt["']\s*\)/s
        );

        assert.doesNotMatch(
            source,
            /target\.occurredAt/
        );
    }
);


test(
    "private follow-up action cannot mutate unrelated CRM or insurance operating state",
    async () => {
        const source =
            await routeSource();

        assert.doesNotMatch(
            source,
            /quoteStatus/
        );

        assert.doesNotMatch(
            source,
            /assignedProducer/
        );

        assert.doesNotMatch(
            source,
            /appointmentAt/
        );

        assert.doesNotMatch(
            source,
            /stageChanged/
        );

        assert.doesNotMatch(
            source,
            /crm-event:/
        );

        assert.doesNotMatch(
            source,
            /relationship_events/
        );
    }
);


test(
    "private follow-up action does not activate contact providers routing or outbound systems",
    async () => {
        const source =
            await routeSource();

        assert.doesNotMatch(
            source,
            /contactAttempt/
        );

        assert.doesNotMatch(
            source,
            /insurance-contact/
        );

        assert.doesNotMatch(
            source,
            /Telnyx/
        );

        assert.doesNotMatch(
            source,
            /sendEmail/
        );

        assert.doesNotMatch(
            source,
            /sendSms/i
        );

        assert.doesNotMatch(
            source,
            /round-robin/i
        );

        assert.doesNotMatch(
            source,
            /leadScore/i
        );

        assert.doesNotMatch(
            source,
            /priorityScore/i
        );
    }
);

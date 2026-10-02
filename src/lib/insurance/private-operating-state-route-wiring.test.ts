import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function routeSource():
    Promise<string> {

    return await readFile(
        new URL(
            "../../pages/river-os/actions/insurance-operating-state.ts",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "private operating-state action reuses River OS same-origin protection and D1 binding",
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
            /status:\s*"?"?/
        );

        assert.match(
            source,
            /403/
        );

        assert.match(
            source,
            /503/
        );
    }
);


test(
    "private operating-state action loads both canonical current records before execution",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /createD1RiverCrmPersistence/
        );

        assert.match(
            source,
            /createD1InsuranceLeadProfilePersistence/
        );

        assert.match(
            source,
            /Promise\.all/
        );

        assert.match(
            source,
            /River CRM relationship was not found/
        );

        assert.match(
            source,
            /Insurance lead profile was not found/
        );

        assert.match(
            source,
            /404/
        );
    }
);


test(
    "private operating-state action delegates policy and persistence to canonical INS-006Q and INS-006S boundaries",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /buildInsurancePrivateOperatingStateRequestFromForm/
        );

        assert.match(
            source,
            /createD1InsuranceLeadOperatingStateExecutor/
        );

        assert.match(
            source,
            /\.execute\(\{/
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
            /buildRiverCrmRelationshipFromForm/
        );
    }
);


test(
    "private operating-state action generates audit identity only for a requested stage change",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /const stageChanged/
        );

        assert.match(
            source,
            /relationship\.stage\s*!==\s*target\.stage/
        );

        assert.match(
            source,
            /stageChanged/
        );

        assert.match(
            source,
            /crm-event:\$\{crypto\.randomUUID\(\)\}/
        );

        assert.match(
            source,
            /eventSource:\s*"river-os"/
        );
    }
);


test(
    "private operating-state action redirects successful no-op or updated execution back to private CRM",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /buildInsurancePrivateCrmActionRedirect/
        );

        assert.match(
            source,
            /"operatingState"/
        );

        assert.match(
            source,
            /result\.outcome/
        );

        assert.match(
            source,
            /303/
        );
    }
);


test(
    "private operating-state action does not activate routing or outbound contact systems",
    async () => {
        const source =
            await routeSource();

        assert.doesNotMatch(
            source,
            /round-robin/i
        );

        assert.doesNotMatch(
            source,
            /Telnyx/
        );

        assert.doesNotMatch(
            source,
            /contactAttempt/
        );

        assert.doesNotMatch(
            source,
            /sendEmail/
        );

        assert.doesNotMatch(
            source,
            /sendSms/i
        );
    }
);

import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function routeSource():
    Promise<string> {

    return await readFile(
        new URL(
            "../../pages/river-os/actions/insurance-appointment.ts",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "private appointment action reuses River OS same-origin protection and RIVER_CRM_DB",
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

        assert.match(source,/403/);
        assert.match(source,/503/);
        assert.match(source,/cache-control/);
        assert.match(source,/no-store/);
    }
);


test(
    "private appointment action parses only the dedicated appointment transport",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /buildInsurancePrivateAppointmentRequestFromForm/
        );

        assert.doesNotMatch(
            source,
            /buildRiverCrmRelationshipFromForm/
        );

        assert.doesNotMatch(
            source,
            /buildInsurancePrivateOperatingStateRequestFromForm/
        );

        assert.doesNotMatch(
            source,
            /buildInsurancePrivateFollowUpRequestFromForm/
        );
    }
);


test(
    "private appointment action loads the canonical relationship before execution",
    async () => {
        const source =
            await routeSource();

        assert.match(source,/createD1RiverCrmPersistence/);
        assert.match(source,/\.get\(\s*target\.relationshipId\s*\)/s);
        assert.match(source,/relationship === undefined/);
        assert.match(source,/River CRM relationship was not found/);
        assert.match(source,/404/);
    }
);


test(
    "private appointment action delegates policy and persistence to canonical INS-007I executor",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /createD1InsuranceLeadAppointmentExecutor/
        );

        assert.match(source,/\.execute\(\{/);
        assert.match(source,/relationship,/);
        assert.match(
            source,
            /appointmentAt:\s*target\.appointmentAt/s
        );

        assert.match(
            source,
            /occurredAt:\s*new Date\(\)\s*\.toISOString\(\)/s
        );

        assert.doesNotMatch(source,/UPDATE river_crm_/);
        assert.doesNotMatch(source,/INSERT INTO river_crm_/);
        assert.doesNotMatch(source,/DELETE FROM river_crm_/);
    }
);


test(
    "private appointment action creates durable audit identity only for schedule transport",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /target\.operation\s*===\s*"schedule"/s
        );

        assert.match(
            source,
            /crm-event:\$\{crypto\.randomUUID\(\)\}/
        );

        assert.match(
            source,
            /eventSource:\s*"river-os"/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\(\s*["']occurredAt["']\s*\)/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\(\s*["']eventId["']\s*\)/s
        );
    }
);


test(
    "private appointment action maps optimistic concurrency invalid state and infrastructure separately",
    async () => {
        const source =
            await routeSource();

        assert.match(source,/InsuranceLeadAppointmentConflictError/);
        assert.match(
            source,
            /instanceof\s+InsuranceLeadAppointmentConflictError/s
        );
        assert.match(source,/409/);
        assert.match(source,/error instanceof TypeError/);
        assert.match(source,/400/);
        assert.match(
            source,
            /Insurance lead appointment could not be saved/
        );
        assert.match(source,/503/);
    }
);


test(
    "private appointment action redirects schedule reschedule clear or no-op outcomes to canonical CRM",
    async () => {
        const source =
            await routeSource();

        assert.match(
            source,
            /\/river-os\/crm\?appointment=\$\{result\.outcome\}/
        );
        assert.match(source,/303/);
    }
);


test(
    "private appointment action cannot mutate other CRM insurance or provider state",
    async () => {
        const source =
            await routeSource();

        for(const forbidden of [
            "quoteStatus",
            "assignedProducer",
            "nextFollowUpAt",
            "stageChanged",
            "insurance-contact",
            "contactAttempt",
            "Telnyx",
            "sendEmail",
            "sendSms",
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

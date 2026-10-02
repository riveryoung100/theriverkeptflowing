import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function crmPage():
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
    "CRM inbound insurance queue uses the canonical INS-006X triage authority",
    async () => {
        const page =
            await crmPage();

        assert.match(
            page,
            /createInsuranceLeadTriageSnapshot/
        );

        assert.match(
            page,
            /selectInsuranceLeadTriageItems/
        );

        assert.match(
            page,
            /INSURANCE_LEAD_TRIAGE_FILTERS/
        );

        assert.match(
            page,
            /InsuranceLeadTriageFilter/
        );

        assert.match(
            page,
            /createD1InsuranceLeadQueuePersistence/
        );

        assert.match(
            page,
            /\.listComplete\(\)/
        );

        assert.match(
            page,
            /listForRelationships\(\s*insuranceQueueRelationships\.map/s
        );

        assert.match(
            page,
            /createInsuranceLeadTriageSnapshot\(\{\s*relationships:\s*insuranceQueueRelationships,\s*insurancePresentations,/s
        );
    }
);


test(
    "CRM inbound insurance queue reads one explicit query parameter and safely falls back to all",
    async () => {
        const page =
            await crmPage();

        assert.match(
            page,
            /Astro\.url\.searchParams\s*\.get\(\s*"insuranceQueue"\s*\)/s
        );

        assert.match(
            page,
            /INSURANCE_LEAD_TRIAGE_FILTERS[\s\S]*\.includes\(\s*requestedInsuranceQueue\s*\)/
        );

        assert.match(
            page,
            /\?\s*requestedInsuranceQueue\s+as\s+InsuranceLeadTriageFilter\s*:\s*"all"/s
        );
    }
);


test(
    "CRM all view preserves the generic relationship cohort while insurance filters use complete canonical triage items",
    async () => {
        const page =
            await crmPage();

        assert.match(
            page,
            /selectedInsuranceQueue\s*===\s*"all"\s*\|\|\s*!insurancePresentationReadable[\s\S]*\?\s*searchedRelationships\s*:\s*selectedInsuranceTriageItems\s*\.map/s
        );

        assert.match(
            page,
            /selectInsuranceLeadTriageItems\(\s*insuranceTriageSnapshot,\s*selectedInsuranceQueue\s*\)/s
        );

        assert.match(
            page,
            /item\s*=>\s*item\.relationship/
        );

        assert.match(
            page,
            /relationships=\{visibleRelationships\}/
        );
    }
);


test(
    "CRM preserves generic relationships if insurance presentation enrichment is unavailable",
    async () => {
        const page =
            await crmPage();

        assert.match(
            page,
            /selectedInsuranceQueue\s*===\s*"all"\s*\|\|\s*!insurancePresentationReadable/s
        );

        assert.match(
            page,
            /Generic CRM relationships remain visible while insurance\s+enrichment is unavailable\./s
        );
    }
);


test(
    "CRM inbound insurance queue exposes every explicit INS-006X operational filter",
    async () => {
        const page =
            await crmPage();

        for(const value of [
            "all",
            "new",
            "requested",
            "in-progress",
            "quoted",
            "unassigned",
            "follow-up-due",
            "suppressed"
        ]){
            assert.match(
                page,
                new RegExp(
                    `"${value}"`
                )
            );
        }

        for(const label of [
            "All relationships",
            "New inbound",
            "Requested",
            "In progress",
            "Quoted",
            "Unassigned",
            "Follow-up due",
            "Suppressed"
        ]){
            assert.match(
                page,
                new RegExp(
                    label
                )
            );
        }
    }
);


test(
    "CRM queue exposes explicit canonical counts instead of an opaque score",
    async () => {
        const page =
            await crmPage();

        for(const count of [
            "newInbound",
            "requested",
            "inProgress",
            "quoted",
            "unassigned",
            "followUpDue",
            "suppressed"
        ]){
            assert.match(
                page,
                new RegExp(
                    count
                )
            );
        }

        assert.doesNotMatch(
            page,
            /priorityScore|leadScore|rankingScore/i
        );
    }
);


test(
    "CRM queue keeps canonical insurance presentation and governed operating-state surfaces intact",
    async () => {
        const page =
            await crmPage();

        assert.match(
            page,
            /createD1InsuranceLeadPresentationPersistence/
        );

        assert.match(
            page,
            /insurancePresentations=\{insurancePresentations\}/
        );

        assert.match(
            page,
            /<CrmRelationshipList/
        );

        assert.doesNotMatch(
            page,
            /InsuranceOperatingStateForm\.astro/
        );
    }
);


test(
    "CRM queue does not introduce routing outbound contact or a second CRM",
    async () => {
        const page =
            await crmPage();

        assert.doesNotMatch(
            page,
            /round-robin|automatic producer|autoAssign/i
        );

        assert.doesNotMatch(
            page,
            /sendSms|sendEmail|sendMessage|powerDial|parallelDial|clickToCall|Telnyx/
        );

        assert.doesNotMatch(
            page,
            /\/river-os\/insurance-crm|\/river-os\/lead-dashboard/
        );
    }
);

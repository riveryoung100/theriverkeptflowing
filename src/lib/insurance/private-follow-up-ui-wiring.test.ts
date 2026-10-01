import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function followUpComponent():
    Promise<string> {

    return await readFile(
        new URL(
            "../../components/river-os/InsuranceFollowUpForm.astro",
            import.meta.url
        ),
        "utf8"
    );
}


async function relationshipComponent():
    Promise<string> {

    return await readFile(
        new URL(
            "../../components/river-os/CrmRelationshipList.astro",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "INS-007F posts schedule only to the canonical private follow-up action",
    async () => {
        const component =
            await followUpComponent();

        assert.match(
            component,
            /action="\/river-os\/actions\/insurance-follow-up"/
        );

        assert.match(
            component,
            /name="relationshipId"/
        );

        assert.match(
            component,
            /name="operation"[\s\S]*value="schedule"/
        );

        assert.match(
            component,
            /name="nextFollowUpAt"/
        );
    }
);


test(
    "INS-007F keeps datetime-local browser-only and submits an absolute ISO timestamp",
    async () => {
        const component =
            await followUpComponent();

        const localInput =
            component.match(
                /<input[^>]*type="datetime-local"[^>]*\/>/
            );

        assert.ok(
            localInput
        );

        assert.match(
            localInput[0],
            /data-follow-up-local/
        );

        assert.doesNotMatch(
            localInput[0],
            /\bname=/
        );

        assert.match(
            component,
            /data-follow-up-absolute/
        );

        assert.match(
            component,
            /new Date\(\s*localValue\s*\)/s
        );

        assert.match(
            component,
            /absoluteDate\s*\.toISOString\(\)/s
        );

        assert.match(
            component,
            /absoluteInput\.value\s*=/s
        );
    }
);


test(
    "INS-007F initializes an existing absolute reminder into the browser local editor",
    async () => {
        const component =
            await followUpComponent();

        assert.match(
            component,
            /data-current-follow-up/
        );

        assert.match(
            component,
            /getTimezoneOffset\(\)/
        );

        assert.match(
            component,
            /\.slice\(\s*0,\s*16\s*\)/s
        );

        assert.match(
            component,
            /localInput\.value\s*=\s*localDateTimeValue/s
        );
    }
);


test(
    "INS-007F displays canonical scheduled follow-up using the established Central-time convention",
    async () => {
        const component =
            await followUpComponent();

        assert.match(
            component,
            /relationshipId/
        );

        assert.match(
            component,
            /nextFollowUpAt/
        );

        assert.match(
            component,
            /America\/Chicago/
        );

        assert.match(
            component,
            /timeZoneName/
        );

        assert.match(
            component,
            /Scheduled for/
        );

        assert.match(
            component,
            /No follow-up scheduled/
        );
    }
);


test(
    "INS-007F exposes explicit clear without a timestamp sentinel",
    async () => {
        const component =
            await followUpComponent();

        assert.match(
            component,
            /nextFollowUpAt !== undefined/
        );

        assert.match(
            component,
            /name="operation"[\s\S]*value="clear"/
        );

        assert.match(
            component,
            /Clear follow-up/
        );

        const clearForm =
            component.match(
                /<form[^>]*class="insurance-follow-up-clear"[^>]*>[\s\S]*?<\/form>/
            );

        assert.ok(
            clearForm
        );

        assert.doesNotMatch(
            clearForm[0],
            /name="nextFollowUpAt"/
        );
    }
);


test(
    "INS-007F cannot mutate insurance operating state or appointment state",
    async () => {
        const component =
            await followUpComponent();

        for(const forbidden of [
            "quoteStatus",
            "assignedProducer",
            "appointmentAt",
            'name="stage"',
            "crm-event:",
            "relationship_events"
        ]){
            assert.equal(
                component.includes(
                    forbidden
                ),
                false
            );
        }
    }
);


test(
    "INS-007F renders only for existing canonical insurance presentations",
    async () => {
        const relationship =
            await relationshipComponent();

        assert.match(
            relationship,
            /import InsuranceFollowUpForm from "\.\/InsuranceFollowUpForm\.astro";/
        );

        assert.match(
            relationship,
            /insuranceByRelationshipId\.has\(\s*relationship\.relationshipId\s*\)[\s\S]*?<InsuranceFollowUpForm/s
        );

        assert.match(
            relationship,
            /relationshipId=\{relationship\.relationshipId\}/
        );

        assert.match(
            relationship,
            /nextFollowUpAt=\{relationship\.nextFollowUpAt\}/
        );
    }
);


test(
    "INS-007F keeps operating-state follow-up and generic CRM controls in separate ordered surfaces",
    async () => {
        const relationship =
            await relationshipComponent();

        const operatingIndex =
            relationship.indexOf(
                "<InsuranceOperatingStateForm"
            );

        const followUpIndex =
            relationship.indexOf(
                "<InsuranceFollowUpForm"
            );

        const genericIndex =
            relationship.indexOf(
                'class="crm-record-form"'
            );

        assert.ok(
            operatingIndex >=
                0
        );

        assert.ok(
            followUpIndex >
                operatingIndex
        );

        assert.ok(
            genericIndex >
                followUpIndex
        );
    }
);


test(
    "INS-007F introduces no contact provider routing scoring or second CRM surface",
    async () => {
        const component =
            await followUpComponent();

        for(const forbidden of [
            "insurance-contact",
            "contactAttempt",
            "Telnyx",
            "sendEmail",
            "sendSms",
            "round-robin",
            "leadScore",
            "priorityScore",
            "fetch("
        ]){
            assert.equal(
                component.toLowerCase().includes(
                    forbidden.toLowerCase()
                ),
                false
            );
        }
    }
);

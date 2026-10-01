import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function appointmentComponent():
    Promise<string> {

    return await readFile(
        new URL(
            "../../components/river-os/InsuranceAppointmentForm.astro",
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
    "INS-007K posts schedule only to the canonical private appointment action",
    async () => {
        const component =
            await appointmentComponent();

        assert.match(
            component,
            /action="\/river-os\/actions\/insurance-appointment"/
        );

        assert.match(component,/name="relationshipId"/);
        assert.match(component,/name="operation"[\s\S]*value="schedule"/);
        assert.match(component,/name="appointmentAt"/);

        assert.doesNotMatch(
            component,
            /insurance-follow-up/
        );
    }
);


test(
    "INS-007K keeps datetime-local browser-only and submits canonical absolute ISO appointment time",
    async () => {
        const component =
            await appointmentComponent();

        const localInput =
            component.match(
                /<input[^>]*type="datetime-local"[^>]*\/>/
            );

        assert.ok(localInput);
        assert.match(localInput[0],/data-appointment-local/);
        assert.doesNotMatch(localInput[0],/\bname=/);
        assert.match(component,/data-appointment-absolute/);
        assert.match(component,/new Date\(\s*localValue\s*\)/s);
        assert.match(component,/absoluteDate\s*\.toISOString\(\)/s);
        assert.match(component,/absoluteInput\.value\s*=/s);
    }
);


test(
    "INS-007K initializes existing appointment into the browser local editor",
    async () => {
        const component =
            await appointmentComponent();

        assert.match(component,/data-current-appointment/);
        assert.match(component,/getTimezoneOffset\(\)/);
        assert.match(component,/\.slice\(\s*0,\s*16\s*\)/s);
        assert.match(
            component,
            /localInput\.value\s*=\s*localDateTimeValue/s
        );
    }
);


test(
    "INS-007K displays canonical appointment using established Central-time convention",
    async () => {
        const component =
            await appointmentComponent();

        assert.match(component,/appointmentAt/);
        assert.match(component,/America\/Chicago/);
        assert.match(component,/timeZoneName/);
        assert.match(component,/Scheduled for/);
        assert.match(component,/No appointment scheduled/);
    }
);


test(
    "INS-007K exposes explicit appointment clear without timestamp sentinel",
    async () => {
        const component =
            await appointmentComponent();

        assert.match(component,/appointmentAt !== undefined/);
        assert.match(component,/name="operation"[\s\S]*value="clear"/);
        assert.match(component,/Clear appointment/);

        const clearForm =
            component.match(
                /<form[^>]*class="insurance-appointment-clear"[^>]*>[\s\S]*?<\/form>/
            );

        assert.ok(clearForm);
        assert.doesNotMatch(clearForm[0],/name="appointmentAt"/);
    }
);


test(
    "INS-007K cannot mutate operating-state follow-up or provider state",
    async () => {
        const component =
            await appointmentComponent();

        for(const forbidden of [
            "quoteStatus",
            "assignedProducer",
            "nextFollowUpAt",
            'name="stage"',
            "crm-event:",
            "relationship_events",
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


test(
    "INS-007K renders appointment controls only for canonical insurance presentations",
    async () => {
        const relationship =
            await relationshipComponent();

        assert.match(
            relationship,
            /import InsuranceAppointmentForm from "\.\/InsuranceAppointmentForm\.astro";/
        );

        assert.match(
            relationship,
            /insuranceByRelationshipId\.has\(\s*relationship\.relationshipId\s*\)[\s\S]*?<InsuranceAppointmentForm/s
        );

        assert.match(
            relationship,
            /relationshipId=\{relationship\.relationshipId\}/
        );

        assert.match(
            relationship,
            /appointmentAt=\{relationship\.appointmentAt\}/
        );
    }
);


test(
    "INS-007K orders operating-state appointment follow-up and generic CRM controls independently",
    async () => {
        const relationship =
            await relationshipComponent();

        const operatingIndex =
            relationship.indexOf(
                "<InsuranceOperatingStateForm"
            );

        const appointmentIndex =
            relationship.indexOf(
                "<InsuranceAppointmentForm"
            );

        const followUpIndex =
            relationship.indexOf(
                "<InsuranceFollowUpForm"
            );

        const genericIndex =
            relationship.indexOf(
                'class="crm-record-form"'
            );

        assert.ok(operatingIndex >= 0);
        assert.ok(appointmentIndex > operatingIndex);
        assert.ok(followUpIndex > appointmentIndex);
        assert.ok(genericIndex > followUpIndex);
    }
);

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


async function triageSource():
    Promise<string> {

    return await readFile(
        new URL(
            "./lead-triage.ts",
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "INS-007M exposes appointments as a canonical insurance triage filter",
    async () => {
        const triage =
            await triageSource();

        assert.match(
            triage,
            /"appointments"/
        );

        assert.match(
            triage,
            /case "appointments":[\s\S]*?appointmentAt !==[\s\S]*?undefined/s
        );

        assert.match(
            triage,
            /readonly appointments:[\s\S]*?number;/s
        );
    }
);


test(
    "INS-007M mounts appointments inside the existing insurance queue filter surface",
    async () => {
        const crm =
            await crmSource();

        assert.match(
            crm,
            /value:[\s\S]*?"appointments"[\s\S]*?label:[\s\S]*?"Appointments"[\s\S]*?\.summary[\s\S]*?\.appointments/s
        );

        assert.doesNotMatch(
            crm,
            /appointment-due|appointment-overdue|appointment-completed|appointment-attended/
        );
    }
);


test(
    "INS-007M adds no provider calendar routing scoring mutation or second CRM authority",
    async () => {
        const triage =
            await triageSource();

        for(const forbidden of [
            "Telnyx",
            "Google Calendar",
            "calendarEventId",
            "round-robin",
            "leadScore",
            "priorityScore",
            "fetch(",
            "appointment-cleared"
        ]){
            assert.equal(
                triage.toLowerCase().includes(
                    forbidden.toLowerCase()
                ),
                false
            );
        }
    }
);

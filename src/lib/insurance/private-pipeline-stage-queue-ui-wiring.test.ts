import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function source(
    path:
        string
):
    Promise<string> {

    return await readFile(
        new URL(
            path,
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "INS-007P exposes namespaced pipeline-stage filters without replacing existing queue meanings",
    async () => {
        const triage =
            await source(
                "./lead-triage.ts"
            );

        for(const filter of [
            "stage-new",
            "stage-contacted",
            "stage-qualified",
            "stage-appointment-set",
            "stage-proposal",
            "stage-won",
            "stage-lost",
            "stage-nurture"
        ]){
            assert.equal(
                triage.includes(
                    `"${filter}"`
                ),
                true
            );
        }

        assert.match(
            triage,
            /case "lost":[\s\S]*?quoteStatus ===[\s\S]*?"lost"/
        );

        assert.match(
            triage,
            /case "stage-lost":[\s\S]*?\.stage ===[\s\S]*?"lost"/
        );

        assert.match(
            triage,
            /case "appointments":[\s\S]*?appointmentAt !==[\s\S]*?undefined/
        );

        assert.match(
            triage,
            /case "stage-appointment-set":[\s\S]*?\.stage ===[\s\S]*?"appointment-set"/
        );
    }
);


test(
    "INS-007P mounts every stage queue inside the existing insuranceQueue surface",
    async () => {
        const crm =
            await source(
                "../../pages/river-os/crm.astro"
            );

        for(const value of [
            "stage-new",
            "stage-contacted",
            "stage-qualified",
            "stage-appointment-set",
            "stage-proposal",
            "stage-won",
            "stage-lost",
            "stage-nurture"
        ]){
            assert.equal(
                crm.includes(
                    `"${value}"`
                ),
                true
            );
        }

        for(const label of [
            "Stage: New",
            "Stage: Contacted",
            "Stage: Qualified",
            "Stage: Appointment set",
            "Stage: Proposal",
            "Stage: Won",
            "Stage: Lost",
            "Stage: Nurture"
        ]){
            assert.equal(
                crm.includes(
                    `"${label}"`
                ),
                true
            );
        }
    }
);


test(
    "INS-007P introduces no mutation routing scoring provider or second CRM authority",
    async () => {
        const triage =
            await source(
                "./lead-triage.ts"
            );

        for(const forbidden of [
            "Telnyx",
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

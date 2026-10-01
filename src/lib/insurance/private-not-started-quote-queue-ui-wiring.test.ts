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
    "INS-007O exposes not-started as exact canonical quote-status triage",
    async () => {
        const triage =
            await source(
                "./lead-triage.ts"
            );

        assert.match(
            triage,
            /case "not-started":[\s\S]*?quoteStatus ===[\s\S]*?"not-started"/
        );

        assert.match(
            triage,
            /readonly notStarted:[\s\S]*?number;/
        );
    }
);


test(
    "INS-007O mounts Not started in the existing insuranceQueue surface",
    async () => {
        const crm =
            await source(
                "../../pages/river-os/crm.astro"
            );

        assert.match(
            crm,
            /value:[\s\S]*?"not-started"[\s\S]*?label:[\s\S]*?"Not started"[\s\S]*?\.summary[\s\S]*?\.notStarted/
        );
    }
);


test(
    "INS-007O does not rewrite public requested ingress or add mutation routing scoring or provider authority",
    async () => {
        const triage =
            await source(
                "./lead-triage.ts"
            );

        const crm =
            await source(
                "../../pages/river-os/crm.astro"
            );

        for(const candidate of [
            triage,
            crm
        ]){
            for(const forbidden of [
                "Telnyx",
                "round-robin",
                "leadScore",
                "priorityScore",
                "appointment-cleared"
            ]){
                assert.equal(
                    candidate.toLowerCase().includes(
                        forbidden.toLowerCase()
                    ),
                    false
                );
            }
        }
    }
);

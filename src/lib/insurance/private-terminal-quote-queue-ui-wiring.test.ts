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
    "INS-007N exposes bound declined and lost in canonical insurance triage",
    async () => {
        const triage =
            await source(
                "./lead-triage.ts"
            );

        assert.match(
            triage,
            /case "bound":[\s\S]*?quoteStatus ===[\s\S]*?"bound"/
        );

        assert.match(
            triage,
            /case "declined":[\s\S]*?quoteStatus ===[\s\S]*?"declined"/
        );

        assert.match(
            triage,
            /case "lost":[\s\S]*?quoteStatus ===[\s\S]*?"lost"/
        );
    }
);


test(
    "INS-007N mounts terminal quote queues in the existing insuranceQueue surface",
    async () => {
        const crm =
            await source(
                "../../pages/river-os/crm.astro"
            );

        assert.match(
            crm,
            /value:[\s\S]*?"bound"[\s\S]*?label:[\s\S]*?"Bound"[\s\S]*?\.summary[\s\S]*?\.bound/
        );

        assert.match(
            crm,
            /value:[\s\S]*?"declined"[\s\S]*?label:[\s\S]*?"Declined"[\s\S]*?\.summary[\s\S]*?\.declined/
        );

        assert.match(
            crm,
            /value:[\s\S]*?"lost"[\s\S]*?label:[\s\S]*?"Lost"[\s\S]*?\.summary[\s\S]*?\.lost/
        );
    }
);


test(
    "INS-007N adds no routing scoring provider mutation or second CRM authority",
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

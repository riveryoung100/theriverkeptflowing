import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";
import {
    fileURLToPath
} from "node:url";

import {
    createInsurancePrivateContactOrchestrationService
} from "./private-contact-orchestration";


const sourcePath =
    fileURLToPath(
        new URL(
            "./private-contact-orchestration.ts",
            import.meta.url
        )
    );


test(
    "INS-007T fails closed when no outbound provider composition is supplied",
    () => {
        const service =
            createInsurancePrivateContactOrchestrationService(
                {} as D1Database
            );

        assert.equal(
            service,
            undefined
        );
    }
);


test(
    "INS-007T composition seam reuses canonical orchestration and D1 persistence factories",
    async () => {
        const source =
            await readFile(
                sourcePath,
                "utf8"
            );

        for(const canonicalFactory of [
            "createInsuranceContactOrchestrationService",
            "createD1RiverCrmPersistence",
            "createD1RiverCrmGrowthPersistence",
            "createD1InsuranceContactAttemptPersistence"
        ]){
            assert.match(
                source,
                new RegExp(
                    canonicalFactory
                )
            );
        }
    }
);


test(
    "INS-007T composition seam contains no concrete provider or direct network transport",
    async () => {
        const source =
            await readFile(
                sourcePath,
                "utf8"
            );

        assert.doesNotMatch(
            source,
            /Telnyx|Twilio|RingCentral|OpenPhone|Plivo|Vonage/i
        );

        assert.doesNotMatch(
            source,
            /\bfetch\s*\(|axios/i
        );

        assert.doesNotMatch(
            source,
            /API_KEY|CONNECTION_ID|FROM_NUMBER|process\.env|import\.meta\.env/i
        );
    }
);
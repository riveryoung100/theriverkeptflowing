import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";
import {
    fileURLToPath
} from "node:url";

const crmPath =
    fileURLToPath(
        new URL(
            "../../pages/river-os/crm.astro",
            import.meta.url
        )
    );

const relationshipListPath =
    fileURLToPath(
        new URL(
            "../../components/river-os/CrmRelationshipList.astro",
            import.meta.url
        )
    );


test(
    "INS-007S loads bounded contact attempts into the canonical private CRM",
    async () => {
        const page =
            await readFile(
                crmPath,
                "utf8"
            );

        assert.match(page,/createD1InsuranceContactAttemptPersistence/);
        assert.match(page,/listAttemptsForRelationships/);
        assert.match(page,/insuranceContactAttempts=\{insuranceContactAttempts\}/);
        assert.match(page,/insuranceContactAttemptsReadable=\{insuranceContactAttemptsReadable\}/);
    }
);


test(
    "INS-007S presents read-only provider-neutral contact-attempt history",
    async () => {
        const component =
            await readFile(
                relationshipListPath,
                "utf8"
            );

        assert.match(component,/Contact attempts/);
        assert.match(component,/Contact-attempt history is unavailable\./);
        assert.match(component,/No contact attempts recorded\./);
        assert.match(component,/failureCode/);
        assert.match(component,/retryable/);
        assert.doesNotMatch(component,/providerReference/);
        assert.doesNotMatch(component,/\/river-os\/actions\/insurance-contact/);
    }
);


test(
    "INS-007S introduces no contact transport control",
    async () => {
        const [page,component] =
            await Promise.all([
                readFile(crmPath,"utf8"),
                readFile(relationshipListPath,"utf8")
            ]);

        const runtime =
            `${page}\n${component}`;

        assert.doesNotMatch(
            runtime,
            /clickToCall|powerDial|parallelDial|requestContact\(|sendSms|sendEmail/
        );
    }
);

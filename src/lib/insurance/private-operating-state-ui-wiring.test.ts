import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function source(
    relative:
        string
):
    Promise<string> {

    return await readFile(
        new URL(
            relative,
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "insurance relationship list mounts governed operating-state form only from insurance context",
    async () => {
        const component =
            await source(
                "../../components/river-os/CrmRelationshipList.astro"
            );

        assert.match(
            component,
            /InsuranceOperatingStateForm/
        );

        assert.match(
            component,
            /insuranceByRelationshipId\.has/
        );

        assert.match(
            component,
            /relationshipId=\{relationship\.relationshipId\}/
        );

        assert.match(
            component,
            /stage=\{relationship\.stage\}/
        );

        assert.match(
            component,
            /quoteStatus=\{[\s\S]*insuranceByRelationshipId\.get/
        );

        assert.match(
            component,
            /assignedProducer=\{[\s\S]*insuranceByRelationshipId\.get/
        );
    }
);


test(
    "insurance operating-state form posts only complete canonical operating target fields",
    async () => {
        const form =
            await source(
                "../../components/river-os/InsuranceOperatingStateForm.astro"
            );

        assert.match(
            form,
            /action="\/river-os\/actions\/insurance-operating-state"/
        );

        assert.match(
            form,
            /method="post"/
        );

        for(const field of [
            "relationshipId",
            "stage",
            "quoteStatus",
            "assignedProducer"
        ]){
            assert.match(
                form,
                new RegExp(
                    `name="${field}"`
                )
            );
        }

        assert.doesNotMatch(
            form,
            /name="productInterest"/
        );

        assert.doesNotMatch(
            form,
            /name="consent"/
        );

        assert.doesNotMatch(
            form,
            /name="email"/
        );

        assert.doesNotMatch(
            form,
            /name="phone"/
        );
    }
);


test(
    "insurance operating-state form exposes every canonical pipeline stage and quote status",
    async () => {
        const form =
            await source(
                "../../components/river-os/InsuranceOperatingStateForm.astro"
            );

        for(const stage of [
            "new",
            "contacted",
            "qualified",
            "appointment-set",
            "proposal",
            "won",
            "lost",
            "nurture"
        ]){
            assert.match(
                form,
                new RegExp(
                    `"${stage}"`
                )
            );
        }

        assert.match(
            form,
            /INSURANCE_QUOTE_STATUSES/
        );

        for(const quoteStatus of [
            "not-started",
            "requested",
            "in-progress",
            "quoted",
            "bound",
            "declined",
            "lost"
        ]){
            assert.match(
                await source(
                    "./lead-profile.ts"
                ),
                new RegExp(
                    `"${quoteStatus}"`
                )
            );
        }
    }
);


test(
    "insurance relationships cannot independently change stage through generic CRM update form",
    async () => {
        const component =
            await source(
                "../../components/river-os/CrmRelationshipList.astro"
            );

        assert.match(
            component,
            /action="\/river-os\/actions\/crm-update"/
        );

        assert.match(
            component,
            /insuranceByRelationshipId\.has[\s\S]*type="hidden"[\s\S]*name="stage"[\s\S]*value=\{relationship\.stage\}/
        );

        assert.match(
            component,
            /<span>Stage<\/span>[\s\S]*<select[\s\S]*name="stage"/
        );
    }
);


test(
    "INS-006V keeps insurance product consent and event context outside the operating-state mutation payload",
    async () => {
        const component =
            await source(
                "../../components/river-os/CrmRelationshipList.astro"
            );

        const form =
            await source(
                "../../components/river-os/InsuranceOperatingStateForm.astro"
            );

        assert.match(
            component,
            /productInterest/
        );

        assert.match(
            component,
            /Consent/
        );

        assert.match(
            component,
            /Recent events/
        );

        assert.doesNotMatch(
            form,
            /productInterest/
        );

        assert.doesNotMatch(
            form,
            /consentChannels/
        );

        assert.doesNotMatch(
            form,
            /recentEvents/
        );
    }
);


test(
    "INS-006V introduces no automatic routing or outbound contact control",
    async () => {
        const runtime =
            [
                await source(
                    "../../components/river-os/CrmRelationshipList.astro"
                ),
                await source(
                    "../../components/river-os/InsuranceOperatingStateForm.astro"
                )
            ].join(
                "\n"
            );

        assert.doesNotMatch(
            runtime,
            /round-robin/i
        );

        assert.doesNotMatch(
            runtime,
            /Telnyx/
        );

        assert.doesNotMatch(
            runtime,
            /sendSms|sendEmail|sendMessage|powerDial|parallelDial|clickToCall/
        );
    }
);

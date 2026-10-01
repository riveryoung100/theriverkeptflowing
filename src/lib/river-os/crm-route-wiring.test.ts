import assert from "node:assert/strict";
import {
    readFileSync
} from "node:fs";
import test from "node:test";
import {
    resolve
} from "node:path";


const crmCreateRouteSource =
    readFileSync(
        resolve(
            process.cwd(),
            "src/pages/river-os/actions/crm-create.ts"
        ),
        "utf8"
    );


test(
    "River CRM create route passes form data into the relationship builder",
    () => {

        assert.match(
            crmCreateRouteSource,
            /relationship\s*=\s*buildRiverCrmRelationshipFromForm\s*\(\s*formData\s*,\s*\{/s
        );

        assert.doesNotMatch(
            crmCreateRouteSource,
            /relationship\s*=\s*buildRiverCrmRelationshipFromForm\s*,/s
        );

    }
);


test(
    "River CRM create route checks same-origin writes against the request",
    () => {

        assert.match(
            crmCreateRouteSource,
            /isSameOriginRiverCrmWriteRequest\s*\(\s*request\s*\)/s
        );

    }
);
test(
    "INS-001D insurance presentation remains additive to canonical CRM workspace",
    async () => {
        const {
            readFileSync:
                read
        } = await import(
            "node:fs"
        );

        const page =
            read(
                new URL(
                    "../../pages/river-os/crm.astro",
                    import.meta.url
                ),
                "utf8"
            );

        assert.match(
            page,
            /createD1RiverCrmPersistence/
        );

        assert.match(
            page,
            /createD1InsuranceLeadPresentationPersistence/
        );

        assert.match(
            page,
            /RIVER_CRM_DB/
        );

        assert.match(
            page,
            /listForRelationships/
        );

        assert.match(
            page,
            /insurancePresentations=\{insurancePresentations\}/
        );

        for(const metric of [
            "Insurance leads",
            "Requested / in progress",
            "Quoted",
            "Bound"
        ]){
            assert.match(
                page,
                new RegExp(
                    metric.replace(
                        "/",
                        "\\/"
                    )
                )
            );
        }
    }
);

test(
    "INS-001D relationship component keeps generic editor and supports governed insurance operating controls",
    async () => {
        const {
            readFileSync:
                read
        } = await import(
            "node:fs"
        );

        const component =
            read(
                new URL(
                    "../../components/river-os/CrmRelationshipList.astro",
                    import.meta.url
                ),
                "utf8"
            );

        assert.match(
            component,
            /insurancePresentations\?/
        );

        assert.match(
            component,
            /insuranceByRelationshipId/
        );

        assert.match(
            component,
            /crm-insurance-card/
        );

        assert.match(
            component,
            />\s*Insurance\s*</
        );

        assert.match(
            component,
            /Consent/
        );

        assert.match(
            component,
            /Recent events/
        );

        assert.match(
            component,
            /\/river-os\/actions\/crm-update/
        );

        assert.match(
            component,
            /InsuranceOperatingStateForm/
        );

        assert.doesNotMatch(
            component,
            /name="productInterest"/
        );

        assert.doesNotMatch(
            component,
            /name="consent"/
        );
    }
);

test(
    "INS-001D workspace presentation introduces no outreach, carrier, or Sesh action",
    async () => {
        const {
            readFileSync:
                read
        } = await import(
            "node:fs"
        );

        const page =
            read(
                new URL(
                    "../../pages/river-os/crm.astro",
                    import.meta.url
                ),
                "utf8"
            );

        const component =
            read(
                new URL(
                    "../../components/river-os/CrmRelationshipList.astro",
                    import.meta.url
                ),
                "utf8"
            );

        const runtime =
            `${page}\n${component}`;

        assert.doesNotMatch(
            runtime,
            /sendSms|sendEmail|sendMessage|dial\(|clickToCall|powerDial|parallelDial/
        );

        assert.doesNotMatch(
            runtime,
            /carrierCredential|carrierPassword|comparativeRating|AMS_DB/
        );

        assert.doesNotMatch(
            runtime,
            /SESH_DB|SESH_AUDIO/
        );
    }
);

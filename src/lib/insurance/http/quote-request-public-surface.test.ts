import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";


async function source(
    relative:
        string
): Promise<string> {
    return await readFile(
        new URL(
            relative,
            import.meta.url
        ),
        "utf8"
    );
}


test(
    "public insurance quote page uses canonical public layout and one dedicated form owner",
    async () => {
        const page =
            await source(
                "../../../pages/insurance/quote.astro"
            );

        assert.match(
            page,
            /MainLayout/
        );

        assert.match(
            page,
            /QuoteRequestForm/
        );

        assert.match(
            page,
            /https:\/\/theriverkeptflowing\.com\/insurance\/quote\//
        );

        assert.doesNotMatch(
            page,
            /RiverOsLayout/
        );

        assert.doesNotMatch(
            page,
            /\/river-os\//
        );
    }
);


test(
    "public quote form submits only through canonical insurance quote API",
    async () => {
        const component =
            await source(
                "../../../components/insurance/QuoteRequestForm.astro"
            );

        assert.match(
            component,
            /\/api\/insurance\/quote-request/
        );

        assert.match(
            component,
            /"idempotency-key"/
        );

        assert.match(
            component,
            /crypto\.randomUUID/
        );

        assert.match(
            component,
            /method:\s*"POST"/
        );

        assert.match(
            component,
            /"application\/json"/
        );

        assert.doesNotMatch(
            component,
            /\/river-os\/actions/
        );
    }
);


test(
    "public quote form exposes canonical product interests and public customer fields",
    async () => {
        const component =
            await source(
                "../../../components/insurance/QuoteRequestForm.astro"
            );

        assert.match(
            component,
            /INSURANCE_PRODUCT_INTERESTS/
        );

        for(const field of [
            "firstName",
            "lastName",
            "email",
            "phone",
            "state",
            "postalCode",
            "productInterest"
        ]){
            assert.match(
                component,
                new RegExp(
                    `name="${field}"`
                )
            );
        }

        assert.match(
            component,
            /consent/
        );

        assert.match(
            component,
            /insurance-quote-v1/
        );

        assert.match(
            component,
            /landingPage/
        );

        assert.match(
            component,
            /utmSource/
        );

        assert.match(
            component,
            /utmMedium/
        );

        assert.match(
            component,
            /utmCampaign/
        );

        assert.match(
            component,
            /utmTerm/
        );

        assert.match(
            component,
            /utmContent/
        );
    }
);


test(
    "public quote form never submits server-owned identity routing or sensitive fields",
    async () => {
        const component =
            await source(
                "../../../components/insurance/QuoteRequestForm.astro"
            );

        for(const forbiddenField of [
            "relationshipId",
            "assignedProducer",
            "quoteStatus",
            "owner",
            "ssn",
            "socialSecurityNumber",
            "driverLicense",
            "driverLicenseNumber",
            "paymentCard",
            "bankAccount",
            "carrierCredential",
            "carrierPassword"
        ]){
            const escaped =
                forbiddenField.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            const submittedField =
                new RegExp(
                    `(?:name=["']${escaped}["']|["']${escaped}["']\\s*:|\\b${escaped}\\s*:)`
                );

            assert.doesNotMatch(
                component,
                submittedField,
                `public quote form must not submit ${forbiddenField}`
            );
        }
    }
);


test(
    "public quote form preserves retry identity only in memory and rotates after material edits",
    async () => {
        const component =
            await source(
                "../../../components/insurance/QuoteRequestForm.astro"
            );

        assert.match(
            component,
            /activeKey/
        );

        assert.match(
            component,
            /activePayload/
        );

        assert.match(
            component,
            /markMaterialEdit/
        );

        assert.match(
            component,
            /activeKey\s*=\s*null/
        );

        assert.doesNotMatch(
            component,
            /localStorage/
        );

        assert.doesNotMatch(
            component,
            /sessionStorage/
        );
    }
);


test(
    "public quote form handles creation replay conflict validation size and retryable failure states",
    async () => {
        const component =
            await source(
                "../../../components/insurance/QuoteRequestForm.astro"
            );

        assert.match(
            component,
            /response\.status ===\s*200/
        );

        assert.match(
            component,
            /response\.status ===\s*201/
        );

        assert.match(
            component,
            /response\.status === 409/
        );

        assert.match(
            component,
            /response\.status === 400/
        );

        assert.match(
            component,
            /response\.status === 413/
        );

        assert.match(
            component,
            /retry without changing the form/
        );
    }
);

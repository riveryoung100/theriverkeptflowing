import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath =
    new URL(
        "../../pages/shop/know-your-number.astro",
        import.meta.url
    );

async function readPageSource(): Promise<string> {
    return readFile(pagePath, "utf8");
}

test(
    "PRODUCT-002N presents the Know Your Number offer from the registered commerce product",
    async () => {
        const source =
            await readPageSource();

        assert.match(
            source,
            /KNOW_YOUR_NUMBER_COMMERCE_PRODUCT/
        );

        assert.match(
            source,
            /unitAmountUsdCents\s*\/\s*100/
        );

        assert.match(
            source,
            /Know Your Number/
        );

        assert.match(
            source,
            /Live\. Enjoy\. Protect\. Build\./
        );
    }
);

test(
    "PRODUCT-002N uses its own price and availability publication authority",
    async () => {
        const source =
            await readPageSource();

        assert.match(
            source,
            /PRODUCT_002N_KNOW_YOUR_NUMBER_PRICE_AVAILABILITY_PUBLICATION_STATE/
        );

        assert.doesNotMatch(
            source,
            /PRODUCT_001F_03_PRICE_AVAILABILITY_PUBLICATION_STATE/
        );
    }
);

test(
    "PRODUCT-002BU publishes governed checkout while preserving exact product identity",
    async () => {
        const source =
            await readPageSource();

        assert.match(
            source,
            /KNOW_YOUR_NUMBER_CHECKOUT_PUBLICATION_STATE/
        );

        assert.match(
            source,
            /data-product-id=\{purchaseCta\.productId\}/
        );

        assert.match(
            source,
            /data-product-version=\{purchaseCta\.productVersion\}/
        );

        assert.match(
            source,
            /productId,\s*productVersion,\s*customerReference,\s*deliveryEmail/
        );

        assert.doesNotMatch(
            source,
            /PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE/
        );

        assert.doesNotMatch(
            source,
            /CLOSED_PRODUCT_PURCHASE_CTA_PUBLICATION_STATE/
        );
    }
);

test(
    "PRODUCT-002N does not send price release or fulfillment metadata from the browser",
    async () => {
        const source =
            await readPageSource();

        const bodyMatch =
            source.match(
                /body:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/
            );

        assert.ok(bodyMatch);

        const requestBody =
            bodyMatch[1];

        assert.match(requestBody, /productId/);
        assert.match(requestBody, /productVersion/);
        assert.match(requestBody, /customerReference/);
        assert.match(requestBody, /deliveryEmail/);

        assert.doesNotMatch(requestBody, /price/i);
        assert.doesNotMatch(requestBody, /release/i);
        assert.doesNotMatch(requestBody, /amount/i);
        assert.doesNotMatch(requestBody, /deliverySubject/i);
        assert.doesNotMatch(requestBody, /deliveryText/i);
    }
);

test(
    "PRODUCT-002N preserves the private-by-design and educational boundaries",
    async () => {
        const source =
            await readPageSource();

        assert.match(
            source,
            /Your completed financial information stays with you\./
        );

        assert.match(
            source,
            /does not need your passwords/
        );

        assert.match(
            source,
            /Educational planning tool only/
        );

        assert.match(
            source,
            /does not promise a particular outcome/
        );
    }
);

test(
    "PRODUCT-002N uses the River-owned MainLayout and library presentation surface",
    async () => {
        const source =
            await readPageSource();

        assert.match(
            source,
            /import MainLayout from "\.\.\/\.\.\/layouts\/MainLayout\.astro"/
        );

        assert.match(source, /<MainLayout/);
        assert.match(source, /class="library-page know-your-number-page"/);
        assert.match(source, /class="library-shell"/);
    }
);

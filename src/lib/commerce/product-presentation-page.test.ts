import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shopPath = new URL("../../pages/shop/index.astro", import.meta.url);
const checkoutApiPath = new URL("../../pages/api/commerce/create-checkout.ts", import.meta.url);

async function readShopSource(): Promise<string> {
    return readFile(shopPath, "utf8");
}

async function readCheckoutApiSource(): Promise<string> {
    return readFile(checkoutApiPath, "utf8");
}

test("PRODUCT-001F-02 presents the actual River Life Operating System", async () => {
    const source = await readShopSource();

    assert.match(source, /RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION/);
    assert.match(source, /Build a life around what matters most\./);
    assert.match(source, /Five parts\. One life examined as a whole\./);
    assert.match(source, /A guided system you can work through/);
});

test("PRODUCT-001F-02 represents all five governed architecture sections", async () => {
    const source = await readShopSource();

    assert.match(source, /section\.id === "headwaters"/);
    assert.match(source, /section\.id === "source"/);
    assert.match(source, /section\.id === "tributaries"/);
    assert.match(source, /section\.id === "current"/);
    assert.match(source, /The Destination/);
});

test("PRODUCT-001F-02 explains paid value as application rather than republication", async () => {
    const source = await readShopSource();

    assert.match(
        source,
        /structured application and guided execution/,
    );

    assert.match(
        source,
        /write, examine,\s*compare, decide/,
    );
});

test("PRODUCT-001F-02 keeps professional and outcome boundaries explicit", async () => {
    const source = await readShopSource();

    assert.match(source, /does not replace therapy/);
    assert.match(source, /medical care/);
    assert.match(source, /legal advice/);
    assert.match(source, /financial advice/);
    assert.match(source, /does not promise a particular result/);
});

test("PRODUCT-001F-02 does not publish price, availability, checkout, or purchase capability", async () => {
    const source = await readShopSource();

    assert.doesNotMatch(source, /\$29/);
    assert.doesNotMatch(source, /Buy now/i);
    assert.doesNotMatch(source, /Purchase now/i);
    assert.doesNotMatch(source, /Add to cart/i);

});


test("PRODUCT-001F-02 preserves the River-owned MainLayout presentation surface", async () => {
    const source = await readShopSource();

    assert.match(
        source,
        /import MainLayout from "\.\.\/\.\.\/layouts\/MainLayout\.astro"/,
    );

    assert.match(source, /<MainLayout/);
    assert.match(source, /class="library-page"/);
    assert.match(source, /class="library-shell"/);
});

test("River Life purchase CTA requires the canonical public commerce authorization gate", async () => {
    const source = await readShopSource();

    assert.match(
        source,
        /isPublicCommerceAuthorized\(product\.publicationState\)/,
    );

    assert.match(
        source,
        /\?\s*buildPublicPurchaseCta\([\s\S]*PRODUCT_001F_04_CHECKOUT_PUBLICATION_STATE[\s\S]*\)\s*:\s*null/,
    );
});

test("server checkout route fails closed for River Life until canonical launch authorization", async () => {
    const source = await readCheckoutApiSource();

    assert.match(
        source,
        /requestedProductId ===[\s\S]*RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT\.productId/,
    );

    assert.match(
        source,
        /requestedProductVersion ===[\s\S]*RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT\.productVersion/,
    );

    assert.match(
        source,
        /!isPublicCommerceAuthorized\([\s\S]*RIVER_LIFE_OPERATING_SYSTEM_PRESENTATION\.publicationState[\s\S]*\)/,
    );

    assert.match(
        source,
        /Product purchasing is not currently available\./,
    );

    assert.match(source, /403/);
});

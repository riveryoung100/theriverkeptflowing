import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shopPath = new URL("../../pages/shop/index.astro", import.meta.url);

async function readShopSource(): Promise<string> {
    return readFile(shopPath, "utf8");
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
    assert.doesNotMatch(source, /workingPriceUsd/);
    assert.doesNotMatch(source, /create-checkout/);
    assert.doesNotMatch(source, /checkoutUrl/);
    assert.doesNotMatch(source, /Buy now/i);
    assert.doesNotMatch(source, /Purchase now/i);
    assert.doesNotMatch(source, /Add to cart/i);

    assert.match(
        source,
        /Public pricing, availability, and purchasing are not\s*being presented here yet\./,
    );
});

test("PRODUCT-001F-02 does not introduce customer purchase form controls", async () => {
    const source = await readShopSource();

    assert.doesNotMatch(source, /<form\b/i);
    assert.doesNotMatch(source, /<button\b/i);
    assert.doesNotMatch(source, /type=["']email["']/i);
    assert.doesNotMatch(source, /\/api\/commerce\/create-checkout/i);
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

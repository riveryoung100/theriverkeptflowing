import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createFoodCartId,
    createFoodMerchandiseQuoteId,
    createInitialFoodCartVersion,
    createInitialFoodMerchandiseQuoteVersion,
    reviseFoodCartVersion,
    reviseFoodMerchandiseQuoteVersion,
    validateFoodCartVersion,
    validateFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";

import {
    reviseFoodApprovedCommercialPriceVersion,
} from "./approved-commercial-price-domain";

function sku(name = "synthetic-a", version = 1) {
    return {
        id: `food-sku:${name}`,
        version,
        servingOffer: {
            offerId: `food-serving-offer:${name}`,
            version: 1,
        },
        package: {
            id: `food-package-definition:${name}`,
            version: 1,
        },
    };
}

function price(
    name: string,
    skuInput: ReturnType<typeof sku>,
    minorUnits = 1250,
    version = 1,
    currency = "USD",
) {
    return {
        id: `food-approved-commercial-price:${name}`,
        version,
        sku: {
            id: skuInput.id,
            version: skuInput.version,
        },
        money: {
            currency,
            minorUnits,
        },
        approval: {
            attribution: "fixture:owner",
            sourceReference: `fixture:approval:${name}:${version}`,
            approvedOn: "2026-10-13",
        },
    };
}

function cart(
    lines: Array<{
        sku: {
            id: string;
            version: number;
        };
        quantity: number;
    }>,
    version = 1,
    id = "food-cart:synthetic-cart",
) {
    return {
        id,
        version,
        lines,
    };
}

test("cart intent uses exact SKU versions and positive safe-integer purchase quantities", () => {
    const a = sku();
    const raw = cart([
        {
            sku: {
                id: a.id,
                version: a.version,
            },
            quantity: 2,
        },
    ]);

    const value = createInitialFoodCartVersion(raw);

    assert.equal(
        createFoodCartId("synthetic-cart"),
        "food-cart:synthetic-cart",
    );
    assert.equal(value.version, 1);
    assert.equal(value.lines[0]?.quantity, 2);
    assert.equal(value.lines[0]?.sku.id, a.id);
    assert(Object.isFrozen(value));
    assert(Object.isFrozen(value.lines));
    assert(Object.isFrozen(value.lines[0]));
    assert(Object.isFrozen(value.lines[0]?.sku));

    raw.lines[0]!.quantity = 99;
    assert.equal(value.lines[0]?.quantity, 2);

    assert.throws(() =>
        createInitialFoodCartVersion({
            ...cart([]),
            version: 2,
        }),
    );

    assert.throws(() =>
        validateFoodCartVersion(
            cart([
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 0,
                },
            ]),
        ),
    );

    assert.throws(() =>
        validateFoodCartVersion(
            cart([
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 1.5,
                },
            ]),
        ),
    );

    assert.throws(() =>
        validateFoodCartVersion(
            cart([
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: Number.MAX_SAFE_INTEGER + 1,
                },
            ]),
        ),
    );

    assert.throws(() =>
        validateFoodCartVersion(
            cart([
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 1,
                },
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 2,
                },
            ]),
        ),
    );

    assert.throws(() =>
        validateFoodCartVersion(
            cart([
                {
                    sku: {
                        id: a.id,
                        version: "latest" as never,
                    },
                    quantity: 1,
                },
            ]),
        ),
    );
});

test("cart revisions are consecutive full replacements with stable cart identity", () => {
    const a = sku();

    const initial = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 1,
            },
        ]),
    );

    const next = reviseFoodCartVersion(initial, {
        id: initial.id,
        version: 2,
        lines: [
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 3,
            },
        ],
    });

    assert.equal(initial.lines[0]?.quantity, 1);
    assert.equal(next.lines[0]?.quantity, 3);

    assert.throws(() =>
        reviseFoodCartVersion(initial, {
            ...next,
            version: 3,
        }),
    );

    assert.throws(() =>
        reviseFoodCartVersion(initial, {
            ...next,
            id: "food-cart:different",
        }),
    );
});

test("merchandise quote derives exact price references and arithmetic independent of input ordering", () => {
    const a = sku("synthetic-a");
    const b = sku("synthetic-b");

    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 2,
            },
            {
                sku: {
                    id: b.id,
                    version: b.version,
                },
                quantity: 3,
            },
        ]),
    );

    const aPrice = price("synthetic-a", a, 1250);
    const bPrice = price("synthetic-b", b, 200);

    const quote = createInitialFoodMerchandiseQuoteVersion(
        {
            id: createFoodMerchandiseQuoteId("synthetic-quote"),
            version: 1,
        },
        cartValue,
        [b, a],
        [bPrice, aPrice],
    );

    assert.equal(quote.cart.id, cartValue.id);
    assert.equal(quote.cart.version, cartValue.version);

    assert.deepEqual(quote.lines[0], {
        sku: {
            id: a.id,
            version: a.version,
        },
        approvedPrice: {
            id: aPrice.id,
            version: aPrice.version,
        },
        quantity: 2,
        unitPrice: {
            currency: "USD",
            minorUnits: 1250,
        },
        merchandiseSubtotal: {
            currency: "USD",
            minorUnits: 2500,
        },
    });

    assert.deepEqual(quote.lines[1]?.merchandiseSubtotal, {
        currency: "USD",
        minorUnits: 600,
    });

    assert.deepEqual(quote.merchandiseSubtotal, {
        currency: "USD",
        minorUnits: 3100,
    });

    assert(Object.isFrozen(quote));
    assert(Object.isFrozen(quote.cart));
    assert(Object.isFrozen(quote.lines));
    assert(Object.isFrozen(quote.lines[0]));
    assert(Object.isFrozen(quote.lines[0]?.sku));
    assert(Object.isFrozen(quote.lines[0]?.approvedPrice));
    assert(Object.isFrozen(quote.lines[0]?.unitPrice));
    assert(Object.isFrozen(quote.lines[0]?.merchandiseSubtotal));
    assert(Object.isFrozen(quote.merchandiseSubtotal));
});

test("structural quote validation rejects injected arithmetic and unsupported fields", () => {
    const a = sku();
    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 2,
            },
        ]),
    );

    const approved = price("synthetic-a", a, 500);

    const quote = createInitialFoodMerchandiseQuoteVersion(
        {
            id: "food-merchandise-quote:synthetic",
            version: 1,
        },
        cartValue,
        [a],
        [approved],
    );

    assert.deepEqual(
        validateFoodMerchandiseQuoteVersion(quote),
        quote,
    );

    assert.throws(() =>
        validateFoodMerchandiseQuoteVersion({
            ...quote,
            merchandiseSubtotal: {
                currency: "USD",
                minorUnits: 999,
            },
        }),
    );

    assert.throws(() =>
        validateFoodMerchandiseQuoteVersion({
            ...quote,
            lines: [
                {
                    ...quote.lines[0],
                    merchandiseSubtotal: {
                        currency: "USD",
                        minorUnits: 999,
                    },
                },
            ],
        }),
    );

    assert.throws(() =>
        validateFoodMerchandiseQuoteVersion({
            ...quote,
            orderable: true,
        }),
    );

    assert.throws(() =>
        validateFoodMerchandiseQuoteVersion({
            ...quote,
            lines: [
                {
                    ...quote.lines[0],
                    tax: {
                        currency: "USD",
                        minorUnits: 1,
                    },
                },
            ],
        }),
    );
});

test("quote creation requires one exact canonical SKU and one exact approved price per cart line", () => {
    const a = sku("synthetic-a");
    const b = sku("synthetic-b");

    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 1,
            },
        ]),
    );

    const aPrice = price("synthetic-a", a);
    const bPrice = price("synthetic-b", b);

    const identity = {
        id: "food-merchandise-quote:binding",
        version: 1,
    };

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [],
            [aPrice],
        ),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [a, b],
            [aPrice],
        ),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [a],
            [],
        ),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [a],
            [bPrice],
        ),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [a],
            [aPrice, aPrice],
        ),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            identity,
            cartValue,
            [a],
            [
                {
                    ...aPrice,
                    sku: {
                        id: a.id,
                        version: 2,
                    },
                },
            ],
        ),
    );
});

test("merchandise quotes reject mixed currencies and unsafe arithmetic", () => {
    const a = sku("synthetic-a");
    const b = sku("synthetic-b");

    const twoLineCart = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 1,
            },
            {
                sku: {
                    id: b.id,
                    version: b.version,
                },
                quantity: 1,
            },
        ]),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            {
                id: "food-merchandise-quote:mixed",
                version: 1,
            },
            twoLineCart,
            [a, b],
            [
                price("synthetic-a", a, 100, 1, "USD"),
                price("synthetic-b", b, 100, 1, "EUR"),
            ],
        ),
    );

    const overflowLineCart = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 2,
            },
        ]),
    );

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            {
                id: "food-merchandise-quote:line-overflow",
                version: 1,
            },
            overflowLineCart,
            [a],
            [
                price(
                    "synthetic-a",
                    a,
                    Number.MAX_SAFE_INTEGER,
                ),
            ],
        ),
    );

    const half = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1;

    assert.throws(() =>
        createInitialFoodMerchandiseQuoteVersion(
            {
                id: "food-merchandise-quote:total-overflow",
                version: 1,
            },
            twoLineCart,
            [a, b],
            [
                price("synthetic-a", a, half),
                price("synthetic-b", b, half),
            ],
        ),
    );
});

test("zero approved money remains valid merchandise quote money", () => {
    const a = sku();

    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 3,
            },
        ]),
    );

    const quote = createInitialFoodMerchandiseQuoteVersion(
        {
            id: "food-merchandise-quote:zero",
            version: 1,
        },
        cartValue,
        [a],
        [price("zero", a, 0)],
    );

    assert.deepEqual(quote.lines[0]?.unitPrice, {
        currency: "USD",
        minorUnits: 0,
    });

    assert.deepEqual(quote.merchandiseSubtotal, {
        currency: "USD",
        minorUnits: 0,
    });
});

test("explicit re-quotation creates a consecutive immutable version without repricing history", () => {
    const a = sku();

    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 2,
            },
        ]),
    );

    const priceV1 = price("synthetic-a", a, 1000);

    const quoteV1 = createInitialFoodMerchandiseQuoteVersion(
        {
            id: "food-merchandise-quote:history",
            version: 1,
        },
        cartValue,
        [a],
        [priceV1],
    );

    const priceV2 =
        reviseFoodApprovedCommercialPriceVersion(
            priceV1,
            {
                ...priceV1,
                version: 2,
                money: {
                    currency: "USD",
                    minorUnits: 1400,
                },
                approval: {
                    attribution: "fixture:owner",
                    sourceReference: "fixture:approval:synthetic-a:2",
                    approvedOn: "2026-10-13",
                },
            },
            a,
        );

    assert.equal(
        quoteV1.lines[0]?.unitPrice.minorUnits,
        1000,
    );

    const quoteV2 = reviseFoodMerchandiseQuoteVersion(
        quoteV1,
        {
            id: quoteV1.id,
            version: 2,
        },
        cartValue,
        [a],
        [priceV2],
    );

    assert.equal(quoteV1.version, 1);
    assert.equal(quoteV1.lines[0]?.unitPrice.minorUnits, 1000);
    assert.equal(quoteV1.merchandiseSubtotal.minorUnits, 2000);

    assert.equal(quoteV2.version, 2);
    assert.equal(quoteV2.lines[0]?.approvedPrice.version, 2);
    assert.equal(quoteV2.lines[0]?.unitPrice.minorUnits, 1400);
    assert.equal(quoteV2.merchandiseSubtotal.minorUnits, 2800);

    assert.throws(() =>
        reviseFoodMerchandiseQuoteVersion(
            quoteV1,
            {
                id: quoteV1.id,
                version: 3,
            },
            cartValue,
            [a],
            [priceV2],
        ),
    );

    assert.throws(() =>
        reviseFoodMerchandiseQuoteVersion(
            quoteV1,
            {
                id: "food-merchandise-quote:different",
                version: 2,
            },
            cartValue,
            [a],
            [priceV2],
        ),
    );

    const differentCart = createInitialFoodCartVersion(
        cart(
            [
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 2,
                },
            ],
            1,
            "food-cart:different",
        ),
    );

    assert.throws(() =>
        reviseFoodMerchandiseQuoteVersion(
            quoteV1,
            {
                id: quoteV1.id,
                version: 2,
            },
            differentCart,
            [a],
            [priceV2],
        ),
    );
});

test("FOOD-005C contains merchandise truth only and has no clock, IO or readiness authority", async () => {
    const a = sku();

    const cartValue = createInitialFoodCartVersion(
        cart([
            {
                sku: {
                    id: a.id,
                    version: a.version,
                },
                quantity: 1,
            },
        ]),
    );

    const quote = createInitialFoodMerchandiseQuoteVersion(
        {
            id: "food-merchandise-quote:boundaries",
            version: 1,
        },
        cartValue,
        [a],
        [price("synthetic-a", a)],
    );

    assert.deepEqual(
        Object.keys(quote).sort(),
        [
            "cart",
            "id",
            "lines",
            "merchandiseSubtotal",
            "version",
        ],
    );

    assert.deepEqual(
        Object.keys(quote.lines[0]!).sort(),
        [
            "approvedPrice",
            "merchandiseSubtotal",
            "quantity",
            "sku",
            "unitPrice",
        ],
    );

    for (const key of [
        "availability",
        "inventory",
        "orderable",
        "checkoutReady",
        "paymentReady",
        "paid",
        "tax",
        "discount",
        "fee",
        "amountDue",
        "grandTotal",
        "createdAt",
        "quotedAt",
        "expiresAt",
        "validUntil",
        "current",
        "latest",
    ]) {
        assert.equal(key in quote, false);
        assert.equal(key in quote.lines[0]!, false);
    }

    const source = await readFile(
        new URL("./cart-quote-domain.ts", import.meta.url),
        "utf8",
    );

    assert.doesNotMatch(
        source,
        /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|stripe|projectFoodPublicMenu/,
    );
});

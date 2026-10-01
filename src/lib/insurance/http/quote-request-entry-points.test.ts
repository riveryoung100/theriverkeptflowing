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


function occurrences(
    text:
        string,
    token:
        string
): number {
    return text
        .split(
            token
        )
        .length -
        1;
}


test(
    "River Guides exposes exactly one contextual insurance quote entry point",
    async () => {
        const page =
            await source(
                "../../../pages/river-guides.astro"
            );

        assert.equal(
            occurrences(
                page,
                "/insurance/quote/"
            ),
            1
        );

        assert.match(
            page,
            /Insurance Education/
        );

        assert.match(
            page,
            /guide-insurance-acquisition/
        );

        assert.match(
            page,
            /Request help with an insurance quote/
        );

        for(const handbook of [
            "homeowners-insurance-handbook",
            "auto-insurance-handbook",
            "renters-insurance-handbook",
            "landlord-insurance-handbook",
            "umbrella-insurance-handbook",
            "life-insurance-handbook"
        ]){
            assert.match(
                page,
                new RegExp(
                    `/library/guides/${handbook}/`
                )
            );
        }
    }
);


test(
    "Insurance tributary preserves education path and adds exactly one quote path",
    async () => {
        const page =
            await source(
                "../../../pages/tributaries.astro"
            );

        assert.equal(
            occurrences(
                page,
                "/insurance/quote/"
            ),
            1
        );

        assert.match(
            page,
            /Explore insurance education/
        );

        assert.match(
            page,
            /href="\/river-guides\/"/
        );

        assert.match(
            page,
            /Request help with an insurance quote/
        );
    }
);


test(
    "contextual acquisition slice does not add a global Navbar quote CTA",
    async () => {
        const navbar =
            await source(
                "../../../components/Navbar.astro"
            );

        assert.equal(
            occurrences(
                navbar,
                "/insurance/quote/"
            ),
            0
        );
    }
);


test(
    "contextual acquisition slice does not inject sales CTA into shared handbook renderer",
    async () => {
        const renderer =
            await source(
                "../../../pages/library/guides/[...slug].astro"
            );

        assert.equal(
            occurrences(
                renderer,
                "/insurance/quote/"
            ),
            0
        );
    }
);


test(
    "contextual entry pages do not duplicate the quote form",
    async () => {
        const riverGuides =
            await source(
                "../../../pages/river-guides.astro"
            );

        const tributaries =
            await source(
                "../../../pages/tributaries.astro"
            );

        assert.doesNotMatch(
            riverGuides,
            /data-insurance-quote-form/
        );

        assert.doesNotMatch(
            tributaries,
            /data-insurance-quote-form/
        );

        assert.doesNotMatch(
            riverGuides,
            /<form\b/i
        );

        assert.doesNotMatch(
            tributaries,
            /<form\b/i
        );
    }
);

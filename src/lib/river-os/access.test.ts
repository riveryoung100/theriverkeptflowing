import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import {
    isRiverOsPath,
    isRiverOsPublicPath,
    readRiverOsAccessKey,
    riverOsAccessKeysMatch
} from "./access";


describe(
    "SITE-001B River OS access foundation",
    () => {

        it(
            "recognizes protected River OS paths",
            () => {

                assert.equal(
                    isRiverOsPath(
                        "/river-os"
                    ),
                    true
                );

                assert.equal(
                    isRiverOsPath(
                        "/river-os/content"
                    ),
                    true
                );

                assert.equal(
                    isRiverOsPath(
                        "/library"
                    ),
                    false
                );

            }
        );


        it(
            "allows only the login route through the public boundary",
            () => {

                assert.equal(
                    isRiverOsPublicPath(
                        "/river-os/login"
                    ),
                    true
                );

                assert.equal(
                    isRiverOsPublicPath(
                        "/river-os/login/"
                    ),
                    true
                );

                assert.equal(
                    isRiverOsPublicPath(
                        "/river-os/logout"
                    ),
                    false
                );

                assert.equal(
                    isRiverOsPublicPath(
                        "/river-os"
                    ),
                    false
                );

            }
        );


        it(
            "reads a configured runtime access key without normalizing it",
            () => {

                const key =
                    "river-os-access-key-example";

                assert.equal(
                    readRiverOsAccessKey({
                        RIVER_OS_ACCESS_KEY:
                            key
                    }),
                    key
                );

            }
        );


        it(
            "fails closed when the runtime access key is absent or malformed",
            () => {

                assert.throws(
                    () =>
                        readRiverOsAccessKey(
                            {}
                        ),
                    /not configured/
                );

                assert.throws(
                    () =>
                        readRiverOsAccessKey({
                            RIVER_OS_ACCESS_KEY:
                                " short-secret-value "
                        }),
                    /not configured/
                );

            }
        );


        it(
            "compares access keys by digest",
            async () => {

                assert.equal(
                    await riverOsAccessKeysMatch(
                        "correct-access-key",
                        "correct-access-key"
                    ),
                    true
                );

                assert.equal(
                    await riverOsAccessKeysMatch(
                        "incorrect-access-key",
                        "correct-access-key"
                    ),
                    false
                );

            }
        );

    }
);
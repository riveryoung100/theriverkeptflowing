import assert from "node:assert/strict";
import test from "node:test";

import {
    assertFileSystemSourceIngestionRequest
} from "./validation";


function createValidRequest(
    content: unknown
): unknown {

    return {
        content,

        assetType:
            "note",

        originalFilename:
            "production-source.bin",

        ownership: {},

        rightsStatus:
            "owned",

        usagePermission: {},

        privacy:
            "private",

        reviewStatus:
            "not-required",

        submittedBy: {
            type:
                "river",

            id:
                "river"
        },

        intakeMethod:
            "manual"
    };

}


test(
    "accepts string production source content",
    () => {

        assert.doesNotThrow(
            () => {
                assertFileSystemSourceIngestionRequest(
                    createValidRequest(
                        "Faith, family, purpose, stewardship, and legacy."
                    )
                );
            }
        );

    }
);


test(
    "accepts Uint8Array production source content",
    () => {

        const content =
            Uint8Array.from(
                [
                    0,
                    1,
                    2,
                    10,
                    13,
                    255
                ]
            );

        assert.doesNotThrow(
            () => {
                assertFileSystemSourceIngestionRequest(
                    createValidRequest(
                        content
                    )
                );
            }
        );

    }
);


test(
    "rejects unsupported production source content",
    () => {

        assert.throws(
            () => {
                assertFileSystemSourceIngestionRequest(
                    createValidRequest(
                        {
                            invalid:
                                true
                        }
                    )
                );
            },
            {
                name:
                    "TypeError",

                message:
                    'Production source request field "content" must be a string or Uint8Array.'
            }
        );

    }
);
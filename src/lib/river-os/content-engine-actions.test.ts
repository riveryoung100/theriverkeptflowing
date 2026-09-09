import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import {
    buildRiverContentTranscriptActionPath,
    buildRiverContentTranscriptActionReturnPath,
    requireRiverContentActionSourceId,
    RIVER_CONTENT_TRANSCRIPT_ACTION_STATUS
} from "./content-engine-actions";

describe(
    "SITE-001G River OS content engine actions",
    () => {

        it(
            "uses a protected River OS transcript action route",
            () => {

                assert.equal(
                    buildRiverContentTranscriptActionPath(),
                    "/river-os/actions/transcript"
                );

            }
        );

        it(
            "returns to the exact canonical source with authorization still required",
            () => {

                assert.equal(
                    buildRiverContentTranscriptActionReturnPath(
                        "source:youtube:dkBgPbiFTX0"
                    ),
                    "/river-os/source?sourceId=source%3Ayoutube%3AdkBgPbiFTX0&transcriptAction=authorization-required"
                );

                assert.equal(
                    RIVER_CONTENT_TRANSCRIPT_ACTION_STATUS,
                    "authorization-required"
                );

            }
        );

        it(
            "rejects malformed source identities before action routing",
            () => {

                assert.throws(
                    () =>
                        requireRiverContentActionSourceId(
                            "youtube:dkBgPbiFTX0"
                        ),
                    /sourceId is invalid/
                );

            }
        );

    }
);

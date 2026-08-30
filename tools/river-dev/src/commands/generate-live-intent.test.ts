import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import {
    GENERATE_LIVE_INTENT_AUTHORIZATION,
    generateLiveIntentRiverDev
} from "./generate-live-intent";


function createOptions(
    overrides:
        Record<string, unknown> = {}
): any {

    return {
        repositoryRoot:
            "/repo",
        configuration:
            {
                repositoryRoot:
                    "/repo"
            },
        planPath:
            ".river-dev/plans/generate-004.json",
        specificationPath:
            ".river-dev/specifications/generate-004.json",
        endpoint:
            "https://example.invalid/v1",
        model:
            "bounded-model",
        authorization:
            GENERATE_LIVE_INTENT_AUTHORIZATION,
        readCredential:
            async () =>
                "test-credential",
        generatedAt:
            "2026-08-30T18:00:00.000Z",
        ...overrides
    };

}


test(
    "GENERATE-004 fails closed before credential consumption without explicit authorization",
    async () => {

        let credentialReads =
            0;

        await assert.rejects(
            () =>
                generateLiveIntentRiverDev(
                    createOptions(
                        {
                            authorization:
                                "not-authorized",
                            readCredential:
                                async () => {
                                    credentialReads += 1;
                                    return "must-not-be-read";
                                }
                        }
                    )
                ),
            /Explicit live model invocation authorization is required/
        );

        assert.equal(
            credentialReads,
            0
        );

    }
);


test(
    "GENERATE-004 validates non-secret operator inputs before credential consumption",
    async () => {

        for (
            const [key, label] of
            [
                ["planPath", "Plan path"],
                ["specificationPath", "Specification path"],
                ["endpoint", "Model endpoint"],
                ["model", "Model name"]
            ] as const
        ) {

            let credentialReads =
                0;

            await assert.rejects(
                () =>
                    generateLiveIntentRiverDev(
                        createOptions(
                            {
                                [key]:
                                    "   ",
                                readCredential:
                                    async () => {
                                        credentialReads += 1;
                                        return "must-not-be-read";
                                    }
                            }
                        )
                    ),
                new RegExp(
                    `${label} is required`
                )
            );

            assert.equal(
                credentialReads,
                0
            );

        }

    }
);


test(
    "GENERATE-004 rejects an empty stdin credential without exposing it",
    async () => {

        await assert.rejects(
            () =>
                generateLiveIntentRiverDev(
                    createOptions(
                        {
                            readCredential:
                                async () =>
                                    "   "
                        }
                    )
                ),
            /Model credential is required through standard input/
        );

    }
);

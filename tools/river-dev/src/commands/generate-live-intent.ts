import type {
    RiverDevConfiguration
} from "../types";

import {
    generateIntentRiverDev
} from "./generate-intent";

import {
    createModelSourceAuthoringProvider
} from "../providers/model-source-authoring-provider";

import {
    createOpenAICompatibleTransport
} from "../providers/openai-compatible-transport";


export const GENERATE_LIVE_INTENT_AUTHORIZATION =
    "I_AUTHORIZE_ONE_BOUNDED_LIVE_MODEL_INVOCATION" as const;


export interface GenerateLiveIntentRiverDevOptions {

    readonly repositoryRoot:
        string;

    readonly configuration:
        RiverDevConfiguration;

    readonly planPath:
        string;

    readonly specificationPath:
        string;

    readonly endpoint:
        string;

    readonly model:
        string;

    readonly authorization:
        string;

    readonly readCredential:
        () => Promise<string>;

    readonly generatedAt:
        string;

}


function requireNonEmpty(
    value:
        string,
    name:
        string
): string {

    const normalized =
        value.trim();

    if (
        normalized.length ===
        0
    ) {
        throw new TypeError(
            `${name} is required.`
        );
    }

    return normalized;

}


export async function generateLiveIntentRiverDev(
    options:
        GenerateLiveIntentRiverDevOptions
) {

    const planPath =
        requireNonEmpty(
            options.planPath,
            "Plan path"
        );

    const specificationPath =
        requireNonEmpty(
            options.specificationPath,
            "Specification path"
        );

    const endpoint =
        requireNonEmpty(
            options.endpoint,
            "Model endpoint"
        );

    const model =
        requireNonEmpty(
            options.model,
            "Model name"
        );

    if (
        options.authorization !==
        GENERATE_LIVE_INTENT_AUTHORIZATION
    ) {
        throw new TypeError(
            "Explicit live model invocation authorization is required."
        );
    }

    const credential =
        (await options.readCredential())
            .trim();

    if (
        credential.length ===
        0
    ) {
        throw new TypeError(
            "Model credential is required through standard input."
        );
    }

    const transport =
        createOpenAICompatibleTransport(
            {
                endpoint,
                model,
                credential:
                    credential
            }
        );

    const provider =
        createModelSourceAuthoringProvider(
            {
                transport
            }
        );

    return generateIntentRiverDev(
        {
            repositoryRoot:
                options.repositoryRoot,
            configuration:
                options.configuration,
            planPath,
            specificationPath,
            generatedAt:
                options.generatedAt,
            provider
        }
    );

}

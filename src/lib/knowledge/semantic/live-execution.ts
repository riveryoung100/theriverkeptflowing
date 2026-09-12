import {
    createSemanticKnowledgeExecution
} from "./execution";

import type {
    SemanticKnowledgeExecution
} from "./execution";

import {
    createSemanticModelProvider
} from "./model-provider";

import {
    createSemanticOpenAICompatibleTransport,
    validateSemanticOpenAICompatibleTransportPublicConfiguration
} from "./openai-compatible-transport";


export const SEMANTIC_LIVE_EXECUTION_AUTHORIZATION =
    "I_AUTHORIZE_ONE_BOUNDED_LIVE_SEMANTIC_MODEL_INVOCATION" as const;


export interface SemanticLiveExecutionOptions {

    readonly endpoint:
        string;

    readonly model:
        string;

    readonly authorization:
        string;

    readonly readCredential:
        () => Promise<string>;

    readonly fetchImplementation?:
        typeof fetch;

}



export async function createAuthorizedLiveSemanticKnowledgeExecution(
    options: SemanticLiveExecutionOptions
): Promise<SemanticKnowledgeExecution> {

    const publicConfiguration =
        validateSemanticOpenAICompatibleTransportPublicConfiguration({
            endpoint:
                options.endpoint,
            model:
                options.model
        });

    const endpoint =
        publicConfiguration.endpoint;

    const model =
        publicConfiguration.model;

    if (
        options.authorization !==
        SEMANTIC_LIVE_EXECUTION_AUTHORIZATION
    ) {
        throw new TypeError(
            "Explicit live semantic model invocation authorization is required."
        );
    }

    const credential =
        (
            await options.readCredential()
        ).trim();

    if (
        credential.length ===
        0
    ) {
        throw new TypeError(
            "Semantic model credential is required through the explicit credential boundary."
        );
    }

    const underlyingTransport =
        createSemanticOpenAICompatibleTransport(
            {
                endpoint,
                model,
                credential
            },
            options.fetchImplementation
        );

    let invocationConsumed =
        false;

    const transport:
        Parameters<
            typeof createSemanticModelProvider
        >[0]["transport"] =
        async (
            request
        ) => {

            if (
                invocationConsumed
            ) {
                throw new TypeError(
                    "Live semantic model invocation authorization has already been consumed."
                );
            }

            invocationConsumed =
                true;

            return underlyingTransport(
                request
            );

        };

    const provider =
        createSemanticModelProvider({
            transport
        });

    return createSemanticKnowledgeExecution(
        provider
    );

}

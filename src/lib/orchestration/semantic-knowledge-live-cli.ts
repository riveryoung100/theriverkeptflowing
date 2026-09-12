import {
    assertAssetId
} from "../assimilation/identifiers";

import {
    SEMANTIC_LIVE_EXECUTION_AUTHORIZATION
} from "../knowledge/semantic/live-execution";

import {
    validateSemanticOpenAICompatibleTransportPublicConfiguration
} from "../knowledge/semantic/openai-compatible-transport";

import {
    createWorkflowId,
    createWorkflowStepId
} from "./identifiers";

import {
    createAuthorizedLiveSemanticProductionWorkflowExecution
} from "./productionExecution";

import type {
    AuthorizedLiveSemanticProductionWorkflowExecutionOptions,
    ProductionWorkflowExecutionService
} from "./productionExecution";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "./types";

import type {
    WorkflowEngineResult,
    WorkflowRunRequest
} from "./types";


export const SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG =
    "--authorize-live-semantic-knowledge" as const;


export interface SemanticKnowledgeLiveCliArguments {

    readonly rawSourceRootDirectory:
        string;

    readonly knowledgeGraphRootDirectory:
        string;

    readonly sourceAssetId:
        string;

    readonly persistenceKey:
        string;

    readonly endpoint:
        string;

    readonly model:
        string;

}


export interface RunSemanticKnowledgeLiveCliOptions {

    readonly arguments:
        readonly string[];

    readonly readCredential:
        () => Promise<string>;

    readonly now?:
        () => string;

    readonly fetchImplementation?:
        typeof fetch;

    readonly createExecution?:
        (
            options:
                AuthorizedLiveSemanticProductionWorkflowExecutionOptions
        ) => Promise<ProductionWorkflowExecutionService>;

}


function requireNonEmpty(
    value:
        string | undefined,
    name:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {

        throw new TypeError(
            `${name} is required.`
        );

    }

    return value.trim();

}


export function parseSemanticKnowledgeLiveCliArguments(
    arguments_:
        readonly string[]
): SemanticKnowledgeLiveCliArguments {

    let authorized =
        false;

    let endpoint:
        string | undefined;

    let model:
        string | undefined;

    const positional:
        string[] =
            [];

    for (
        let index =
            0;
        index <
            arguments_.length;
        index +=
            1
    ) {

        const argument =
            arguments_[index];

        if (
            argument ===
            SEMANTIC_KNOWLEDGE_LIVE_CLI_AUTHORIZATION_FLAG
        ) {

            if (
                authorized
            ) {

                throw new TypeError(
                    "Live semantic Knowledge authorization may be specified only once."
                );

            }

            authorized =
                true;

            continue;

        }

        if (
            argument ===
            "--endpoint"
        ) {

            if (
                endpoint !==
                undefined
            ) {

                throw new TypeError(
                    "Semantic model endpoint may be specified only once."
                );

            }

            endpoint =
                requireNonEmpty(
                    arguments_[
                        index +
                        1
                    ],
                    "Semantic model endpoint"
                );

            index +=
                1;

            continue;

        }

        if (
            argument ===
            "--model"
        ) {

            if (
                model !==
                undefined
            ) {

                throw new TypeError(
                    "Semantic model identifier may be specified only once."
                );

            }

            model =
                requireNonEmpty(
                    arguments_[
                        index +
                        1
                    ],
                    "Semantic model identifier"
                );

            index +=
                1;

            continue;

        }

        if (
            argument?.startsWith(
                "--"
            )
        ) {

            throw new TypeError(
                `Unexpected semantic Knowledge option: ${argument}`
            );

        }

        positional.push(
            requireNonEmpty(
                argument,
                "Semantic Knowledge positional argument"
            )
        );

    }

    if (
        !authorized
    ) {

        throw new TypeError(
            "Explicit live semantic Knowledge authorization is required."
        );

    }

    if (
        positional.length !==
        4
    ) {

        throw new TypeError(
            "Usage: knowledge:semantic:live <raw-source-root> <knowledge-graph-root> <source-asset-id> <persistence-key> --endpoint <url> --model <model> --authorize-live-semantic-knowledge < credential-via-stdin"
        );

    }

    const rawSourceRootDirectory =
        positional[0]!;

    const knowledgeGraphRootDirectory =
        positional[1]!;

    const sourceAssetId =
        positional[2]!;

    const persistenceKey =
        positional[3]!;

    assertAssetId(
        sourceAssetId
    );

    const publicConfiguration =
        validateSemanticOpenAICompatibleTransportPublicConfiguration({
            endpoint:
                requireNonEmpty(
                    endpoint,
                    "Semantic model endpoint"
                ),
            model:
                requireNonEmpty(
                    model,
                    "Semantic model identifier"
                )
        });

    return {
        rawSourceRootDirectory,
        knowledgeGraphRootDirectory,
        sourceAssetId,
        persistenceKey,
        endpoint:
            publicConfiguration.endpoint,
        model:
            publicConfiguration.model
    };

}


export async function readSemanticModelCredentialFromStdin(
    input:
        NodeJS.ReadableStream = process.stdin
): Promise<string> {

    let credential =
        "";

    input.setEncoding(
        "utf8"
    );

    for await (
        const chunk of
        input
    ) {

        credential +=
            String(
                chunk
            );

    }

    return credential.trim();

}


export async function runSemanticKnowledgeLiveCli(
    options:
        RunSemanticKnowledgeLiveCliOptions
): Promise<WorkflowEngineResult> {

    const parsed =
        parseSemanticKnowledgeLiveCliArguments(
            options.arguments
        );

    const requestedAt =
        (
            options.now ??
            (
                () =>
                    new Date()
                        .toISOString()
            )
        )();

    const createExecution =
        options.createExecution ??
        createAuthorizedLiveSemanticProductionWorkflowExecution;

    const execution =
        await createExecution({
            rawSourceRootDirectory:
                parsed.rawSourceRootDirectory,
            knowledgeGraphRootDirectory:
                parsed.knowledgeGraphRootDirectory,
            endpoint:
                parsed.endpoint,
            model:
                parsed.model,
            authorization:
                SEMANTIC_LIVE_EXECUTION_AUTHORIZATION,
            readCredential:
                options.readCredential,
            ...(
                options.fetchImplementation ===
                    undefined
                    ? {}
                    : {
                        fetchImplementation:
                            options.fetchImplementation
                    }
            )
        });

    const workflowId =
        createWorkflowId();

    const stepId =
        createWorkflowStepId();

    const request:
        WorkflowRunRequest = {

            workflow: {
                id:
                    workflowId,
                name:
                    "Live Semantic Knowledge Build",
                description:
                    "Build durable Knowledge from authoritative production Assimilation records through one explicitly authorized bounded semantic model invocation.",
                status:
                    "ready",
                steps: [
                    {
                        id:
                            stepId,
                        name:
                            "Build Semantic Knowledge",
                        type:
                            "knowledge-build",
                        dependsOn:
                            [],
                        inputs: [
                            {
                                key:
                                    "sourceAssetId",
                                value:
                                    parsed.sourceAssetId
                            },
                            {
                                key:
                                    "persistenceKey",
                                value:
                                    parsed.persistenceKey
                            }
                        ],
                        failurePolicy:
                            "stop",
                        requiresReview:
                            false
                    }
                ],
                createdAt:
                    requestedAt,
                version:
                    1,
                schemaVersion:
                    ORCHESTRATION_SCHEMA_VERSION
            },

            requestedAt,

            context:
                {}

        };

    return execution.execute(
        request
    );

}

import {
    createHash
} from "node:crypto";

import {
    RIVER_DEV_VERSION
} from "../types";

import type {
    RiverDevCommandName,
    RiverDevRepositorySnapshot,
    RiverDevRunState,
    RiverDevRunStatus
} from "../types";


function createRunIdentifierSource(
    command:
        RiverDevCommandName,
    repository:
        RiverDevRepositorySnapshot,
    startedAt:
        string
): string {

    return JSON.stringify({

        command,

        repositoryRoot:
            repository.repositoryRoot,

        branch:
            repository.branch,

        commit:
            repository.commit,

        startedAt

    });

}


export function createRiverDevRunId(
    command:
        RiverDevCommandName,
    repository:
        RiverDevRepositorySnapshot,
    startedAt:
        string
): string {

    const source =
        createRunIdentifierSource(
            command,
            repository,
            startedAt
        );

    const digest =
        createHash(
            "sha256"
        )
            .update(
                source
            )
            .digest(
                "hex"
            )
            .slice(
                0,
                24
            );

    return `run:${digest}`;

}


export function createRiverDevRun(
    command:
        RiverDevCommandName,
    status:
        RiverDevRunStatus,
    repository:
        RiverDevRepositorySnapshot,
    startedAt:
        string,
    messages:
        readonly string[] = []
): RiverDevRunState {

    return {

        version:
            RIVER_DEV_VERSION,

        runId:
            createRiverDevRunId(
                command,
                repository,
                startedAt
            ),

        command,

        status,

        startedAt,

        updatedAt:
            startedAt,

        repository,

        messages

    };

}


export function updateRiverDevRun(
    run:
        RiverDevRunState,
    status:
        RiverDevRunStatus,
    updatedAt:
        string,
    message?:
        string
): RiverDevRunState {

    return {

        ...run,

        status,

        updatedAt,

        messages:
            message ===
                undefined
                ? run.messages
                : [
                    ...run.messages,
                    message
                ]

    };

}

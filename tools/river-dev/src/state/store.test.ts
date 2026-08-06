import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    readFile,
    rm
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    RIVER_DEV_VERSION
} from "../types";

import type {
    RiverDevRepositorySnapshot,
    RiverDevRunState
} from "../types";

import {
    createRiverDevStateStore
} from "./store";


function createSnapshot(
    root: string
): RiverDevRepositorySnapshot {

    return {

        repositoryRoot:
            root,

        branch:
            "dev-test",

        commit:
            "1234567890123456789012345678901234567890",

        clean:
            true,

        changedPaths:
            [],

        capturedAt:
            "2026-08-06T01:40:00.000Z"

    };

}


function createRun(
    root: string,
    status:
        RiverDevRunState["status"] =
            "inspecting"
): RiverDevRunState {

    return {

        version:
            RIVER_DEV_VERSION,

        runId:
            "run:test-001",

        command:
            "inspect",

        status,

        startedAt:
            "2026-08-06T01:40:00.000Z",

        updatedAt:
            "2026-08-06T01:40:00.000Z",

        repository:
            createSnapshot(
                root
            ),

        messages: [
            "Test run"
        ]

    };

}


test(
    "loads empty state when no file exists",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            const state =
                await store.load();

            assert.equal(
                state.activeRun,
                null
            );

            assert.deepEqual(
                state.completedRuns,
                []
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "begins and reloads an active run",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            const run =
                createRun(
                    root
                );

            await store.beginRun(
                run
            );

            const state =
                await store.load();

            assert.equal(
                state.activeRun?.runId,
                run.runId
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "rejects beginning a second active run",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            const run =
                createRun(
                    root
                );

            await store.beginRun(
                run
            );

            await assert.rejects(
                async () => {
                    await store.beginRun(
                        run
                    );
                },
                TypeError
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "updates the active run",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            const run =
                createRun(
                    root
                );

            await store.beginRun(
                run
            );

            const updatedRun = {

                ...run,

                status:
                    "verifying" as const,

                updatedAt:
                    "2026-08-06T01:41:00.000Z"

            };

            await store.updateRun(
                updatedRun
            );

            const state =
                await store.load();

            assert.equal(
                state.activeRun?.status,
                "verifying"
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "completes and archives an active run",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            const run =
                createRun(
                    root
                );

            await store.beginRun(
                run
            );

            const completedRun = {

                ...run,

                status:
                    "completed" as const,

                updatedAt:
                    "2026-08-06T01:42:00.000Z"

            };

            const state =
                await store.completeRun(
                    completedRun
                );

            assert.equal(
                state.activeRun,
                null
            );

            assert.equal(
                state.completedRuns.length,
                1
            );

            assert.equal(
                state.completedRuns[0]?.status,
                "completed"
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "writes formatted JSON atomically",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-state-"
                )
            );

        try {

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginRun(
                createRun(
                    root
                )
            );

            const statePath =
                join(
                    root,
                    ".river-dev",
                    "state",
                    "river-dev-state.json"
                );

            const source =
                await readFile(
                    statePath,
                    "utf8"
                );

            assert.match(
                source,
                /"activeRun":/
            );

            assert.match(
                source,
                /\n  "version":/
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);

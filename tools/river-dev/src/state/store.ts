import {
    mkdir,
    readFile,
    rename,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    resolve
} from "node:path";

import {
    RIVER_DEV_VERSION
} from "../types";

import type {
    RiverDevRunState,
    RiverDevStateStore,
    RiverDevStoredState
} from "../types";


const EMPTY_STATE:
RiverDevStoredState = {

    version:
        RIVER_DEV_VERSION,

    activeRun:
        null,

    completedRuns:
        []

};


function removeUtf8Bom(
    source: string
): string {

    if (
        source.charCodeAt(
            0
        ) ===
        0xfeff
    ) {
        return source.slice(
            1
        );
    }

    return source;

}


function validateStoredState(
    state: RiverDevStoredState
): void {

    if (
        state.version !==
        RIVER_DEV_VERSION
    ) {
        throw new TypeError(
            `Unsupported River Dev state version: ${state.version}`
        );
    }

    if (
        !Array.isArray(
            state.completedRuns
        )
    ) {
        throw new TypeError(
            "Completed runs must be an array."
        );
    }

}


export class JsonRiverDevStateStore
implements RiverDevStateStore {

    private readonly statePath:
        string;


    constructor(
        repositoryRoot: string,
        statePath:
            string = ".river-dev/state/river-dev-state.json"
    ) {

        this.statePath =
            resolve(
                repositoryRoot,
                statePath
            );

    }


    async load():
    Promise<RiverDevStoredState> {

        try {

            const source =
                await readFile(
                    this.statePath,
                    "utf8"
                );

            const state =
                JSON.parse(
                    removeUtf8Bom(
                        source
                    )
                ) as RiverDevStoredState;

            validateStoredState(
                state
            );

            return state;

        }
        catch (
            error: unknown
        ) {

            if (
                error !==
                    null &&
                typeof error ===
                    "object" &&
                "code" in error &&
                error.code ===
                    "ENOENT"
            ) {
                return EMPTY_STATE;
            }

            throw error;

        }

    }


    async save(
        state: RiverDevStoredState
    ): Promise<void> {

        validateStoredState(
            state
        );

        await mkdir(
            dirname(
                this.statePath
            ),
            {
                recursive:
                    true
            }
        );

        const temporaryPath =
            `${this.statePath}.tmp`;

        const serialized =
            `${JSON.stringify(
                state,
                null,
                2
            )}\n`;

        await writeFile(
            temporaryPath,
            serialized,
            "utf8"
        );

        await rename(
            temporaryPath,
            this.statePath
        );

    }


    async beginRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState> {

        const current =
            await this.load();

        if (
            current.activeRun !==
            null
        ) {
            throw new TypeError(
                `An active River Dev run already exists: ${current.activeRun.runId}`
            );
        }

        const updated:
            RiverDevStoredState = {

            ...current,

            activeRun:
                run

        };

        await this.save(
            updated
        );

        return updated;

    }


    async updateRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState> {

        const current =
            await this.load();

        if (
            current.activeRun ===
            null
        ) {
            throw new TypeError(
                "No active River Dev run exists."
            );
        }

        if (
            current.activeRun.runId !==
            run.runId
        ) {
            throw new TypeError(
                "River Dev run identifier does not match the active run."
            );
        }

        const updated:
            RiverDevStoredState = {

            ...current,

            activeRun:
                run

        };

        await this.save(
            updated
        );

        return updated;

    }


    async completeRun(
        run: RiverDevRunState
    ): Promise<RiverDevStoredState> {

        const current =
            await this.load();

        if (
            current.activeRun ===
            null
        ) {
            throw new TypeError(
                "No active River Dev run exists."
            );
        }

        if (
            current.activeRun.runId !==
            run.runId
        ) {
            throw new TypeError(
                "River Dev run identifier does not match the active run."
            );
        }

        const updated:
            RiverDevStoredState = {

            version:
                current.version,

            activeRun:
                null,

            completedRuns: [
                ...current.completedRuns,
                run
            ]

        };

        await this.save(
            updated
        );

        return updated;

    }


    async clearActiveRun():
    Promise<RiverDevStoredState> {

        const current =
            await this.load();

        const updated:
            RiverDevStoredState = {

            ...current,

            activeRun:
                null

        };

        await this.save(
            updated
        );

        return updated;

    }

}


export function createRiverDevStateStore(
    repositoryRoot: string
): RiverDevStateStore {

    return new
        JsonRiverDevStateStore(
            repositoryRoot
        );

}

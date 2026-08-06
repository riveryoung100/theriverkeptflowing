import {
    execFile
} from "node:child_process";

import {
    promisify
} from "node:util";

import type {
    RiverDevRepositorySnapshot
} from "../types";


const execFileAsync =
    promisify(
        execFile
    );


interface GitCommandResult {

    readonly stdout:
        string;

    readonly stderr:
        string;

}


async function runGit(
    repositoryRoot: string,
    argumentsList:
        readonly string[]
): Promise<GitCommandResult> {

    const result =
        await execFileAsync(
            "git",
            [
                ...argumentsList
            ],
            {
                cwd:
                    repositoryRoot,
                windowsHide:
                    true
            }
        );

    return {
        stdout:
            result.stdout,
        stderr:
            result.stderr
    };

}


function splitLines(
    value: string
): readonly string[] {

    return value
        .split(
            /\r?\n/
        )
        .map(
            (line) => {
                return line.trim();
            }
        )
        .filter(
            (line) => {
                return line.length > 0;
            }
        );

}


function normalizeStatusPath(
    statusLine: string
): string {

    const path =
        statusLine
            .slice(
                3
            )
            .trim()
            .replaceAll(
                "\\",
                "/"
            );

    const renameParts =
        path.split(
            " -> "
        );

    return (
        renameParts[
            renameParts.length - 1
        ] ??
        path
    )
        .replace(
            /^"|"$/g,
            ""
        );

}


export async function getCurrentBranch(
    repositoryRoot: string
): Promise<string> {

    const result =
        await runGit(
            repositoryRoot,
            [
                "branch",
                "--show-current"
            ]
        );

    const branch =
        result.stdout.trim();

    if (
        branch.length ===
        0
    ) {
        throw new TypeError(
            "Could not determine the current Git branch."
        );
    }

    return branch;

}


export async function getLatestCommit(
    repositoryRoot: string
): Promise<string> {

    const result =
        await runGit(
            repositoryRoot,
            [
                "rev-parse",
                "HEAD"
            ]
        );

    const commit =
        result.stdout.trim();

    if (
        commit.length ===
        0
    ) {
        throw new TypeError(
            "Could not determine the current Git commit."
        );
    }

    return commit;

}


export async function getChangedPaths(
    repositoryRoot: string
): Promise<readonly string[]> {

    const result =
        await runGit(
            repositoryRoot,
            [
                "-c",
                "status.showUntrackedFiles=all",
                "status",
                "--porcelain=v1"
            ]
        );

    return splitLines(
        result.stdout
    )
        .map(
            normalizeStatusPath
        )
        .sort();

}


export async function captureRepositorySnapshot(
    repositoryRoot: string,
    capturedAt:
        string = new Date()
            .toISOString()
): Promise<RiverDevRepositorySnapshot> {

    const [
        branch,
        commit,
        changedPaths
    ] =
        await Promise.all([
            getCurrentBranch(
                repositoryRoot
            ),
            getLatestCommit(
                repositoryRoot
            ),
            getChangedPaths(
                repositoryRoot
            )
        ]);

    return {

        repositoryRoot,

        branch,

        commit,

        clean:
            changedPaths.length ===
            0,

        changedPaths,

        capturedAt

    };

}

import {
    readdir,
    readFile
} from "node:fs/promises";

import {
    resolve
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";

import {
    getCurrentBranch
} from "../git/repository";


interface PhaseSpecificationIdentity {

    readonly branch:
        string;

}


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


async function readSpecificationBranch(
    path: string
): Promise<string | null> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    const parsed =
        JSON.parse(
            removeUtf8Bom(
                source
            )
        ) as Partial<PhaseSpecificationIdentity>;

    if (
        typeof parsed.branch !==
            "string" ||
        parsed.branch.trim().length ===
            0
    ) {
        return null;
    }

    return parsed.branch.trim();

}


export async function resolvePhaseSpecification(
    configuration:
        RiverDevConfiguration,
    branch?:
        string
): Promise<string> {

    const activeBranch =
        branch ??
        await getCurrentBranch(
            configuration.repositoryRoot
        );

    if (
        !/^dev-\d+-/i.test(
            activeBranch
        )
    ) {
        throw new TypeError(
            `Current branch is not a River Dev phase branch: ${activeBranch}`
        );
    }

    const specificationsRoot =
        resolve(
            configuration.repositoryRoot,
            ".river-dev",
            "specifications"
        );

    const entries =
        (
            await readdir(
                specificationsRoot,
                {
                    withFileTypes:
                        true
                }
            )
        )
            .filter(
                (entry) => {
                    return (
                        entry.isFile() &&
                        entry.name.endsWith(
                            ".json"
                        )
                    );
                }
            )
            .sort(
                (left, right) => {
                    return left.name.localeCompare(
                        right.name
                    );
                }
            );

    const matches:
        string[] = [];

    for (
        const entry of
        entries
    ) {

        const candidatePath =
            resolve(
                specificationsRoot,
                entry.name
            );

        const specificationBranch =
            await readSpecificationBranch(
                candidatePath
            );

        if (
            specificationBranch ===
            activeBranch
        ) {
            matches.push(
                candidatePath
            );
        }

    }

    if (
        matches.length ===
        0
    ) {
        throw new TypeError(
            `No River Dev specification found for branch: ${activeBranch}`
        );
    }

    if (
        matches.length >
        1
    ) {
        throw new TypeError(
            `Multiple River Dev specifications found for branch: ${activeBranch}`
        );
    }

    const match =
        matches[0];

    if (
        match ===
        undefined
    ) {
        throw new TypeError(
            `Phase specification resolution failed unexpectedly for branch: ${activeBranch}`
        );
    }

    return match;

}


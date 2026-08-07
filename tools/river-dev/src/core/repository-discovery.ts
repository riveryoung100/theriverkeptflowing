import {
    readdir
} from "node:fs/promises";

import {
    relative,
    resolve,
    sep
} from "node:path";

import type {
    Dirent
} from "node:fs";

import type {
    RiverDevConfiguration,
    RiverDevRepositoryDiscoveryEntry,
    RiverDevRepositoryDiscoveryReport,
    RiverDevRepositoryPathClassification
} from "../types";

import {
    captureRepositorySnapshot
} from "../git/repository";


export const RIVER_DEV_REPOSITORY_DISCOVERY_VERSION =
    "1.0.0" as const;


function normalizeRepositoryPath(
    value: string
): string {

    return value
        .replaceAll(
            "\\",
            "/"
        )
        .replace(
            /^\.\/+/,
            ""
        )
        .replace(
            /\/+/g,
            "/"
        );

}


function normalizePattern(
    value: string
): string {

    return normalizeRepositoryPath(
        value
    );

}


function escapeRegExp(
    value: string
): string {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


function globPatternToRegExp(
    pattern: string
): RegExp {

    const normalized =
        normalizePattern(
            pattern
        );

    let expression =
        "";

    for (
        let index = 0;
        index < normalized.length;
        index += 1
    ) {

        const character =
            normalized[index];

        const nextCharacter =
            normalized[
                index + 1
            ];

        const followingCharacter =
            normalized[
                index + 2
            ];

        if (
            character === "*" &&
            nextCharacter === "*" &&
            followingCharacter === "/"
        ) {

            expression +=
                "(?:.*/)?";

            index +=
                2;

            continue;

        }

        if (
            character === "/" &&
            nextCharacter === "*" &&
            followingCharacter === "*" &&
            index + 3 === normalized.length
        ) {

            expression +=
                "(?:/.*)?";

            index +=
                2;

            continue;

        }

        if (
            character === "*" &&
            nextCharacter === "*"
        ) {

            expression +=
                ".*";

            index +=
                1;

            continue;

        }

        if (
            character === "*"
        ) {

            expression +=
                "[^/]*";

            continue;

        }

        expression +=
            escapeRegExp(
                character ?? ""
            );

    }

    return new RegExp(
        `^${expression}$`,
        "i"
    );

}


function matchesPattern(
    path: string,
    pattern: string
): boolean {

    const normalizedPath =
        normalizeRepositoryPath(
            path
        );

    const normalizedPattern =
        normalizePattern(
            pattern
        );

    if (
        !normalizedPattern.includes(
            "*"
        )
    ) {

        return (
            normalizedPath === normalizedPattern ||
            normalizedPath.startsWith(
                `${normalizedPattern}/`
            )
        );

    }

    return globPatternToRegExp(
        normalizedPattern
    ).test(
        normalizedPath
    );

}


function isProtectedRepositoryPath(
    configuration:
        RiverDevConfiguration,
    path:
        string
): boolean {

    const protectedPatterns = [
        ...configuration.projectMap
            .protectedPaths,
        ...configuration.safetyPolicy
            .secrets
            .denyPatterns
    ];

    return protectedPatterns.some(
        (pattern) => {
            return matchesPattern(
                path,
                pattern
            );
        }
    );

}


function isTestPath(
    path: string
): boolean {

    return (
        path.endsWith(
            ".test.ts"
        ) ||
        path.endsWith(
            ".test.tsx"
        ) ||
        path.endsWith(
            ".spec.ts"
        ) ||
        path.endsWith(
            ".spec.tsx"
        ) ||
        path.includes(
            "/__tests__/"
        )
    );

}


function isConfigurationPath(
    path: string
): boolean {

    const fileName =
        path.split(
            "/"
        )
            .at(
                -1
            ) ??
        path;

    return (
        fileName === "package.json" ||
        fileName === "package-lock.json" ||
        fileName === "tsconfig.json" ||
        fileName.startsWith(
            "tsconfig."
        ) ||
        fileName.startsWith(
            "astro.config."
        ) ||
        fileName.startsWith(
            "vite.config."
        ) ||
        fileName.startsWith(
            "eslint.config."
        ) ||
        fileName.startsWith(
            ".eslintrc"
        ) ||
        fileName.startsWith(
            ".prettierrc"
        ) ||
        fileName === ".gitignore" ||
        fileName === ".gitattributes"
    );

}


function isInfrastructurePath(
    path: string
): boolean {

    return (
        path === ".github" ||
        path.startsWith(
            ".github/"
        ) ||
        path === "cloudflare" ||
        path.startsWith(
            "cloudflare/"
        ) ||
        path === "netlify.toml" ||
        path.startsWith(
            "infrastructure/"
        ) ||
        path.startsWith(
            "infra/"
        )
    );

}


function isContentPath(
    path: string
): boolean {

    return (
        path === "src/content" ||
        path.startsWith(
            "src/content/"
        ) ||
        path === "content" ||
        path.startsWith(
            "content/"
        )
    );

}


function classifyRepositoryPath(
    configuration:
        RiverDevConfiguration,
    path:
        string,
    protectedPath:
        boolean
): RiverDevRepositoryPathClassification {

    if (
        protectedPath
    ) {
        return "protected";
    }

    if (
        path === ".river-dev" ||
        path.startsWith(
            ".river-dev/"
        ) ||
        path === "tools/river-dev" ||
        path.startsWith(
            "tools/river-dev/"
        )
    ) {
        return "river-dev";
    }

    if (
        isTestPath(
            path
        )
    ) {
        return "test";
    }

    const documentationRoot =
        normalizeRepositoryPath(
            configuration.projectMap
                .paths
                .documentation ??
            "docs"
        );

    if (
        path === documentationRoot ||
        path.startsWith(
            `${documentationRoot}/`
        )
    ) {
        return "documentation";
    }

    if (
        isConfigurationPath(
            path
        )
    ) {
        return "configuration";
    }

    if (
        isInfrastructurePath(
            path
        )
    ) {
        return "infrastructure";
    }

    if (
        isContentPath(
            path
        )
    ) {
        return "content";
    }

    const publicAssetsRoot =
        normalizeRepositoryPath(
            configuration.projectMap
                .paths
                .publicAssets ??
            "public"
        );

    if (
        path === publicAssetsRoot ||
        path.startsWith(
            `${publicAssetsRoot}/`
        )
    ) {
        return "public-asset";
    }

    const sourceRoot =
        normalizeRepositoryPath(
            configuration.projectMap
                .paths
                .publicApplication ??
            "src"
        );

    if (
        path === sourceRoot ||
        path.startsWith(
            `${sourceRoot}/`
        )
    ) {
        return "source";
    }

    return "other";

}


function assertInsideRepository(
    repositoryRoot: string,
    candidatePath: string
): void {

    const resolvedRoot =
        resolve(
            repositoryRoot
        );

    const resolvedCandidate =
        resolve(
            candidatePath
        );

    const relativePath =
        relative(
            resolvedRoot,
            resolvedCandidate
        );

    if (
        relativePath === ""
    ) {
        return;
    }

    if (
        relativePath === ".." ||
        relativePath.startsWith(
            `..${sep}`
        )
    ) {
        throw new TypeError(
            `Repository discovery attempted to leave repository boundary: ${candidatePath}`
        );
    }

}


async function discoverDirectory(
    configuration:
        RiverDevConfiguration,
    absoluteDirectory:
        string,
    relativeDirectory:
        string,
    entries:
        RiverDevRepositoryDiscoveryEntry[]
): Promise<void> {

    assertInsideRepository(
        configuration.repositoryRoot,
        absoluteDirectory
    );

    const children:
        Dirent[] =
        await readdir(
            absoluteDirectory,
            {
                withFileTypes:
                    true
            }
        );

    children.sort(
        (left, right) => {
            return left.name.localeCompare(
                right.name
            );
        }
    );

    for (
        const child of
        children
    ) {

        const repositoryPath =
            normalizeRepositoryPath(
                relativeDirectory.length === 0
                    ? child.name
                    : `${relativeDirectory}/${child.name}`
            );

        const absolutePath =
            resolve(
                absoluteDirectory,
                child.name
            );

        assertInsideRepository(
            configuration.repositoryRoot,
            absolutePath
        );

        const protectedPath =
            isProtectedRepositoryPath(
                configuration,
                repositoryPath
            );

        const kind =
            child.isDirectory()
                ? "directory" as const
                : "file" as const;

        entries.push({
            path:
                repositoryPath,
            kind,
            classification:
                classifyRepositoryPath(
                    configuration,
                    repositoryPath,
                    protectedPath
                ),
            protected:
                protectedPath
        });

        if (
            child.isDirectory() &&
            !protectedPath
        ) {

            await discoverDirectory(
                configuration,
                absolutePath,
                repositoryPath,
                entries
            );

        }

    }

}


function createKeyPathMap(
    configuration:
        RiverDevConfiguration
): Readonly<Record<string, string>> {

    const entries =
        Object.entries(
            configuration.projectMap
                .paths
        )
            .map(
                ([
                    key,
                    value
                ]) => {

                    return [
                        key,
                        normalizeRepositoryPath(
                            value
                        )
                    ] as const;

                }
            )
            .sort(
                (
                    [left],
                    [right]
                ) => {

                    return left.localeCompare(
                        right
                    );

                }
            );

    return Object.fromEntries(
        entries
    );

}


export async function discoverRepository(
    configuration:
        RiverDevConfiguration,
    discoveredAt:
        string = new Date()
            .toISOString()
): Promise<RiverDevRepositoryDiscoveryReport> {

    if (
        configuration.safetyPolicy
            .repositoryBoundary
            .allowOutsideRepository
    ) {
        throw new TypeError(
            "Repository discovery requires repository-boundary enforcement."
        );
    }

    if (
        configuration.safetyPolicy
            .repositoryBoundary
            .allowParentDirectoryTraversal
    ) {
        throw new TypeError(
            "Repository discovery may not allow parent-directory traversal."
        );
    }

    const snapshot =
        await captureRepositorySnapshot(
            configuration.repositoryRoot,
            discoveredAt
        );

    const entries:
        RiverDevRepositoryDiscoveryEntry[] =
        [];

    await discoverDirectory(
        configuration,
        configuration.repositoryRoot,
        "",
        entries
    );

    entries.sort(
        (left, right) => {
            return left.path.localeCompare(
                right.path
            );
        }
    );

    const files =
        entries.filter(
            (entry) => {
                return entry.kind === "file";
            }
        )
            .length;

    const directories =
        entries.filter(
            (entry) => {
                return entry.kind === "directory";
            }
        )
            .length;

    const protectedCount =
        entries.filter(
            (entry) => {
                return entry.protected;
            }
        )
            .length;

    return {
        version:
            RIVER_DEV_REPOSITORY_DISCOVERY_VERSION,
        repositoryRoot:
            configuration.repositoryRoot,
        projectName:
            configuration.projectMap
                .project
                .name,
        branch:
            snapshot.branch,
        commit:
            snapshot.commit,
        discoveredAt,
        entries,
        counts: {
            total:
                entries.length,
            files,
            directories,
            protected:
                protectedCount
        },
        keyPaths:
            createKeyPathMap(
                configuration
            )
    };

}

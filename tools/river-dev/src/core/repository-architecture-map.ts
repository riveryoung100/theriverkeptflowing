import {
    readFile
} from "node:fs/promises";

import {
    extname,
    join,
    posix
} from "node:path";

import ts from "typescript";

import type {
    RiverDevRepositoryArchitectureImpact,
    RiverDevRepositoryArchitectureImport,
    RiverDevRepositoryArchitectureMap,
    RiverDevRepositoryArchitectureModule,
    RiverDevRepositoryDiscoveryReport
} from "../types";


export const RIVER_DEV_REPOSITORY_ARCHITECTURE_MAP_VERSION =
    "1.0.0" as const;


function normalizeRepositoryPath(
    value: string
): string {

    return value
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "");

}


function isTypeScriptSourcePath(
    path: string
): boolean {

    return path.endsWith(".ts") ||
        path.endsWith(".tsx");

}


function resolveLocalSpecifier(
    importerPath: string,
    specifier: string,
    modulePaths: ReadonlySet<string>
): string | null {

    if (!specifier.startsWith(".")) {
        return null;
    }

    const base = normalizeRepositoryPath(
        posix.normalize(
            posix.join(
                posix.dirname(importerPath),
                specifier
            )
        )
    );

    const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}/index.ts`,
        `${base}/index.tsx`
    ];

    for (const candidate of candidates) {
        if (modulePaths.has(candidate)) {
            return candidate;
        }
    }

    return null;

}


function extractExportNames(
    sourceFile: ts.SourceFile
): string[] {

    const names = new Set<string>();

    for (const statement of sourceFile.statements) {
        const modifiers = ts.canHaveModifiers(statement)
            ? ts.getModifiers(statement)
            : undefined;
        const exported = modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
        ) ?? false;

        if (
            exported &&
            (
                ts.isFunctionDeclaration(statement) ||
                ts.isClassDeclaration(statement) ||
                ts.isInterfaceDeclaration(statement) ||
                ts.isTypeAliasDeclaration(statement) ||
                ts.isEnumDeclaration(statement)
            ) &&
            statement.name
        ) {
            names.add(statement.name.text);
        }

        if (exported && ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) {
                    names.add(declaration.name.text);
                }
            }
        }

        if (ts.isExportAssignment(statement)) {
            names.add("default");
        }

        if (ts.isExportDeclaration(statement)) {
            if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                for (const element of statement.exportClause.elements) {
                    names.add(element.name.text);
                }
            }
        }
    }

    return [...names].sort();

}


function extractImports(
    sourceFile: ts.SourceFile,
    importerPath: string,
    modulePaths: ReadonlySet<string>
): RiverDevRepositoryArchitectureImport[] {

    const imports: RiverDevRepositoryArchitectureImport[] = [];

    for (const statement of sourceFile.statements) {
        let specifier: string | null = null;
        let kind: "import" | "export-from" | null = null;

        if (
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier)
        ) {
            specifier = statement.moduleSpecifier.text;
            kind = "import";
        }

        if (
            ts.isExportDeclaration(statement) &&
            statement.moduleSpecifier &&
            ts.isStringLiteral(statement.moduleSpecifier)
        ) {
            specifier = statement.moduleSpecifier.text;
            kind = "export-from";
        }

        if (specifier === null || kind === null) {
            continue;
        }

        const resolvedPath = resolveLocalSpecifier(
            importerPath,
            specifier,
            modulePaths
        );

        imports.push({
            specifier,
            kind,
            resolvedPath,
            external: !specifier.startsWith(".")
        });
    }

    return imports.sort((left, right) => {
        const bySpecifier = left.specifier.localeCompare(right.specifier);
        if (bySpecifier !== 0) {
            return bySpecifier;
        }
        return left.kind.localeCompare(right.kind);
    });

}


export async function createRepositoryArchitectureMap(
    discovery: RiverDevRepositoryDiscoveryReport
): Promise<RiverDevRepositoryArchitectureMap> {

    const sourceEntries = discovery.entries
        .filter((entry) => {
            return entry.kind === "file" &&
                !entry.protected &&
                isTypeScriptSourcePath(entry.path);
        })
        .slice()
        .sort((left, right) => left.path.localeCompare(right.path));

    const modulePaths = new Set(
        sourceEntries.map((entry) => entry.path)
    );

    const preliminary: Array<{
        path: string;
        classification: typeof sourceEntries[number]["classification"];
        imports: RiverDevRepositoryArchitectureImport[];
        exports: string[];
        dependencies: string[];
    }> = [];

    for (const entry of sourceEntries) {
        const absolutePath = join(
            discovery.repositoryRoot,
            ...entry.path.split("/")
        );
        const sourceText = await readFile(absolutePath, "utf8");
        const sourceFile = ts.createSourceFile(
            entry.path,
            sourceText,
            ts.ScriptTarget.Latest,
            true,
            extname(entry.path) === ".tsx"
                ? ts.ScriptKind.TSX
                : ts.ScriptKind.TS
        );

        const imports = extractImports(
            sourceFile,
            entry.path,
            modulePaths
        );
        const dependencies = [...new Set(
            imports
                .map((item) => item.resolvedPath)
                .filter((path): path is string => path !== null)
        )].sort();

        preliminary.push({
            path: entry.path,
            classification: entry.classification,
            imports,
            exports: extractExportNames(sourceFile),
            dependencies
        });
    }

    const dependentMap = new Map<string, string[]>();
    for (const item of preliminary) {
        dependentMap.set(item.path, []);
    }

    for (const item of preliminary) {
        for (const dependency of item.dependencies) {
            dependentMap.get(dependency)?.push(item.path);
        }
    }

    const keyPathValues = new Set(
        Object.values(discovery.keyPaths)
            .map(normalizeRepositoryPath)
    );

    const modules: RiverDevRepositoryArchitectureModule[] = preliminary
        .map((item) => {
            const dependents = [...(dependentMap.get(item.path) ?? [])]
                .sort();
            return {
                path: item.path,
                classification: item.classification,
                imports: item.imports,
                exports: item.exports,
                dependencies: item.dependencies,
                dependents,
                entryPoint: keyPathValues.has(item.path) ||
                    dependents.length === 0
            };
        })
        .sort((left, right) => left.path.localeCompare(right.path));

    return {
        version: RIVER_DEV_REPOSITORY_ARCHITECTURE_MAP_VERSION,
        repositoryRoot: discovery.repositoryRoot,
        projectName: discovery.projectName,
        branch: discovery.branch,
        commit: discovery.commit,
        discoveredAt: discovery.discoveredAt,
        modules
    };

}


export function createRepositoryArchitectureImpact(
    architecture: RiverDevRepositoryArchitectureMap,
    changedPaths: readonly string[]
): RiverDevRepositoryArchitectureImpact {

    const normalizedChangedPaths = [...new Set(
        changedPaths.map(normalizeRepositoryPath)
    )].sort();

    const changedSet = new Set(normalizedChangedPaths);
    const directDependents = [...new Set(
        architecture.modules
            .filter((module) => changedSet.has(module.path))
            .flatMap((module) => module.dependents)
    )].sort();

    return {
        changedPaths: normalizedChangedPaths,
        directDependents
    };

}

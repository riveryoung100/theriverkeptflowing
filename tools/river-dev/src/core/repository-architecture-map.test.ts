import assert from "node:assert/strict";
import {
    mkdtemp,
    mkdir,
    rm,
    writeFile
} from "node:fs/promises";
import {
    join
} from "node:path";
import {
    tmpdir
} from "node:os";
import test from "node:test";

import {
    createRepositoryArchitectureImpact,
    createRepositoryArchitectureMap
} from "./repository-architecture-map";

import type {
    RiverDevRepositoryDiscoveryReport
} from "../types";


async function createFixture(): Promise<{
    root: string;
    discovery: RiverDevRepositoryDiscoveryReport;
}> {

    const root = await mkdtemp(
        join(tmpdir(), "river-dev-understand-001-")
    );

    await mkdir(join(root, "src", "lib"), { recursive: true });
    await mkdir(join(root, "src", "protected"), { recursive: true });

    await writeFile(
        join(root, "src", "lib", "engine.ts"),
        'export const engine = true;\nexport interface Engine { readonly ready: boolean; }\n',
        "utf8"
    );
    await writeFile(
        join(root, "src", "feature.ts"),
        'import { engine } from "./lib/engine";\nimport fs from "node:fs";\nexport const feature = engine;\n',
        "utf8"
    );
    await writeFile(
        join(root, "src", "index.ts"),
        'export { feature } from "./feature";\nexport { engine as publicEngine } from "./lib/engine";\n',
        "utf8"
    );
    await writeFile(
        join(root, "src", "broken.ts"),
        'import { missing } from "./missing";\nexport const broken = missing;\n',
        "utf8"
    );
    await writeFile(
        join(root, "src", "protected", "secret.ts"),
        'export const secret = true;\n',
        "utf8"
    );

    return {
        root,
        discovery: {
            version: "1.0.0",
            repositoryRoot: root,
            projectName: "fixture",
            branch: "main",
            commit: "abc123",
            discoveredAt: "2026-08-29T00:00:00.000Z",
            entries: [
                { path: "src", kind: "directory", classification: "source", protected: false },
                { path: "src/broken.ts", kind: "file", classification: "source", protected: false },
                { path: "src/feature.ts", kind: "file", classification: "source", protected: false },
                { path: "src/index.ts", kind: "file", classification: "source", protected: false },
                { path: "src/lib", kind: "directory", classification: "source", protected: false },
                { path: "src/lib/engine.ts", kind: "file", classification: "source", protected: false },
                { path: "src/protected", kind: "directory", classification: "protected", protected: true },
                { path: "src/protected/secret.ts", kind: "file", classification: "protected", protected: true }
            ],
            counts: {
                total: 8,
                files: 5,
                directories: 3,
                protected: 2
            },
            keyPaths: {
                source: "src/index.ts"
            }
        }
    };

}


test("UNDERSTAND-001 creates deterministic TypeScript architectural relationships", async () => {
    const fixture = await createFixture();
    try {
        const first = await createRepositoryArchitectureMap(fixture.discovery);
        const second = await createRepositoryArchitectureMap(fixture.discovery);
        assert.deepEqual(second, first);
        assert.deepEqual(
            first.modules.map((module) => module.path),
            ["src/broken.ts", "src/feature.ts", "src/index.ts", "src/lib/engine.ts"]
        );
        const engine = first.modules.find((module) => module.path === "src/lib/engine.ts");
        const feature = first.modules.find((module) => module.path === "src/feature.ts");
        const index = first.modules.find((module) => module.path === "src/index.ts");
        const broken = first.modules.find((module) => module.path === "src/broken.ts");
        assert.ok(engine);
        assert.ok(feature);
        assert.ok(index);
        assert.ok(broken);
        assert.deepEqual(engine.exports, ["Engine", "engine"]);
        assert.deepEqual(engine.dependencies, []);
        assert.deepEqual(engine.dependents, ["src/feature.ts", "src/index.ts"]);
        assert.deepEqual(feature.dependencies, ["src/lib/engine.ts"]);
        assert.deepEqual(feature.dependents, ["src/index.ts"]);
        assert.deepEqual(index.dependencies, ["src/feature.ts", "src/lib/engine.ts"]);
        assert.equal(index.entryPoint, true);
        assert.equal(first.modules.some((module) => module.path.includes("protected")), false);
        assert.deepEqual(
            feature.imports.map((item) => ({ specifier: item.specifier, resolvedPath: item.resolvedPath, external: item.external })),
            [
                { specifier: "./lib/engine", resolvedPath: "src/lib/engine.ts", external: false },
                { specifier: "node:fs", resolvedPath: null, external: true }
            ]
        );
        assert.deepEqual(
            broken.imports.map((item) => ({ specifier: item.specifier, resolvedPath: item.resolvedPath, external: item.external })),
            [
                { specifier: "./missing", resolvedPath: null, external: false }
            ]
        );
    } finally {
        await rm(fixture.root, { recursive: true, force: true });
    }
});


test("UNDERSTAND-001 derives bounded direct impact", async () => {
    const fixture = await createFixture();
    try {
        const architecture = await createRepositoryArchitectureMap(fixture.discovery);
        assert.deepEqual(
            createRepositoryArchitectureImpact(
                architecture,
                ["./src/lib/engine.ts", "src/lib/engine.ts"]
            ),
            {
                changedPaths: ["src/lib/engine.ts"],
                directDependents: ["src/feature.ts", "src/index.ts"]
            }
        );
    } finally {
        await rm(fixture.root, { recursive: true, force: true });
    }
});

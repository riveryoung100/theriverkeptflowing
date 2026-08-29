import { strict as assert } from "node:assert";

import {
    execFileSync
} from "node:child_process";

import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    test
} from "node:test";

import {
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevConfiguration
} from "../types";

import {
    executeExecutionPackageLifecycleRiverDev
} from "./execution-package-lifecycle";

async function withTemporaryRepository(
    callback: (repositoryRoot: string, configuration: RiverDevConfiguration) => Promise<void>
): Promise<void> {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "river-dev-execution-package-lifecycle-"));
    try {
        execFileSync("git", ["init", "-b", "dev-331-execution-package-lifecycle"], { cwd: repositoryRoot, stdio: "ignore" });
        const baseConfiguration = await loadRiverDevConfiguration(process.cwd());
        const configuration = { ...baseConfiguration, repositoryRoot } satisfies RiverDevConfiguration;
        await callback(repositoryRoot, configuration);
    }
    finally {
        await rm(repositoryRoot, { recursive: true, force: true });
    }
}

async function writeFixtureFiles(repositoryRoot: string): Promise<{ proposalPath: string; manifestPath: string; verificationPath: string; }> {
    const proposalPath = join(repositoryRoot, "proposal.json");
    const manifestPath = join(repositoryRoot, "manifest.json");
    const verificationPath = join(repositoryRoot, "verification.json");
    await writeFile(proposalPath, JSON.stringify({ version: "1.0.0", proposalId: "proposal:intent:dev-331-lifecycle", planId: "plan:dev-331-lifecycle", branch: "dev-331-execution-package-lifecycle", objective: "Exercise the governed execution-package lifecycle.", approved: true, operations: [{ type: "write-file", path: "generated/dev-331-lifecycle.ts", content: "export const dev331Lifecycle = true;\n", overwrite: false, reason: "Exercise DEV-331 lifecycle orchestration." }] }, null, 2), "utf8");
    await writeFile(manifestPath, JSON.stringify({ version: "1.0.0", implementationId: "implementation:proposal:intent:dev-331-lifecycle", planId: "plan:dev-331-lifecycle", branch: "dev-331-execution-package-lifecycle", description: "Exercise the governed execution-package lifecycle.", operations: [{ type: "write-file", path: "generated/dev-331-lifecycle.ts", content: "export const dev331Lifecycle = true;\n", overwrite: false }] }, null, 2), "utf8");
    await writeFile(verificationPath, JSON.stringify({ verificationId: "verification:dev-331-lifecycle", passed: true, verifiedAt: "2026-08-29T00:00:00.000Z", commands: ["typecheck", "tests"], warnings: [] }, null, 2), "utf8");
    return { proposalPath, manifestPath, verificationPath };
}

test("creates persists and executes the authoritative package lifecycle in dry-run mode", async () => {
    await withTemporaryRepository(async (repositoryRoot, configuration) => {
        const fixture = await writeFixtureFiles(repositoryRoot);
        const result = await executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath);
        assert.equal(result.creation.executionPackage.packageId, "execution-package:implementation-proposal-intent-dev-331-lifecycle");
        assert.equal(result.persistence.persisted, true);
        assert.equal(result.execution.mode, "dry-run");
        assert.equal(result.execution.implementation.applied, false);
        const persisted = JSON.parse(await readFile(join(repositoryRoot, result.persistence.repositoryPath), "utf8"));
        assert.deepEqual(persisted, result.creation.executionPackage);
        await assert.rejects(readFile(join(repositoryRoot, "generated", "dev-331-lifecycle.ts"), "utf8"));
    });
});

test("rejects apply intent when governed authorization is absent", async () => {
    await withTemporaryRepository(async (repositoryRoot, configuration) => {
        const fixture = await writeFixtureFiles(repositoryRoot);
        await assert.rejects(executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath, "apply"), /authorization is absent/i);
        await assert.rejects(readFile(join(repositoryRoot, "generated", "dev-331-lifecycle.ts"), "utf8"));
    });
});

test("forwards existing governed authorization unchanged to governed execution", async () => {
    await withTemporaryRepository(async (repositoryRoot, configuration) => {
        const fixture = await writeFixtureFiles(repositoryRoot);
        const authorization = { authorizationState: "OPERATION_EXECUTION_AUTHORIZED" as const };
        const result = await executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath, "apply", authorization);
        assert.equal(result.execution.mode, "apply");
        assert.equal(result.execution.explicitApplyAuthorized, true);
        assert.equal(result.execution.implementation.applied, true);
        assert.equal(await readFile(join(repositoryRoot, "generated", "dev-331-lifecycle.ts"), "utf8"), "export const dev331Lifecycle = true;\n");
    });
});

test("fails before persistence and execution when creation rejects invalid source artifacts", async () => {
    await withTemporaryRepository(async (repositoryRoot, configuration) => {
        const fixture = await writeFixtureFiles(repositoryRoot);
        const proposal = JSON.parse(await readFile(fixture.proposalPath, "utf8"));
        proposal.approved = false;
        await writeFile(fixture.proposalPath, JSON.stringify(proposal, null, 2), "utf8");
        await assert.rejects(executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath));
        await assert.rejects(readFile(join(repositoryRoot, "generated", "dev-331-lifecycle.ts"), "utf8"));
    });
});

test("preserves immutable persistence by rejecting a repeated lifecycle for the same package", async () => {
    await withTemporaryRepository(async (repositoryRoot, configuration) => {
        const fixture = await writeFixtureFiles(repositoryRoot);
        await executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath);
        await assert.rejects(executeExecutionPackageLifecycleRiverDev(configuration, fixture.proposalPath, fixture.manifestPath, fixture.verificationPath));
    });
});

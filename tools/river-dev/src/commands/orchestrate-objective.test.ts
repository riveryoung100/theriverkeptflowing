import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import type { RiverDevConfiguration } from "../types";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import {
    orchestrateProductionObjectiveRiverDev,
    orchestrateObjectiveRiverDev,
    type RiverDevObjectiveOrchestrationDependencies
} from "./orchestrate-objective";

const execFileAsync = promisify(execFile);

async function initializeTemporaryGitRepository(repositoryRoot: string): Promise<void> {
    await execFileAsync("git", ["init"], { cwd: repositoryRoot });
    await execFileAsync("git", ["config", "user.email", "river-dev-test@example.invalid"], { cwd: repositoryRoot });
    await execFileAsync("git", ["config", "user.name", "River Dev Test"], { cwd: repositoryRoot });
    await writeFile(join(repositoryRoot, ".river-dev-test-root"), "orchestrate-objective-session-test"+String.fromCharCode(10), "utf8");
    await execFileAsync("git", ["add", ".river-dev-test-root"], { cwd: repositoryRoot });
    await execFileAsync("git", ["commit", "-m", "Initialize orchestration session test repository"], { cwd: repositoryRoot });
}

function createFixtureDependencies(calls: string[]): RiverDevObjectiveOrchestrationDependencies {
    const context = { branch: "fixture-branch" } as any;
    const plan = { planId: "fixture-plan", branch: "fixture-branch" } as any;
    const intent = { intentId: "fixture-intent" } as any;
    const proposal = { version: "1.0.0", proposalId: "fixture-proposal", planId: "fixture-plan", branch: "fixture-branch", objective: "fixture objective", approved: true, operations: [] } as any;
    const manifest = { implementationId: "fixture-implementation" } as any;
    const preVerification = { verificationId: "fixture-pre-verification", passed: true, verifiedAt: "2026-08-31T00:00:00.000Z", commands: [], warnings: [] } as any;
    const executionPackage = { version: "1.0.0", packageId: "fixture-package", planId: "fixture-plan", branch: "fixture-branch", state: "ready-for-implementation" } as any;
    const persistedExecutionPackagePath = ".river-dev/execution-packages/fixture-package.json";
    const execution = { packageId: "fixture-package", mode: "dry-run", implementation: {}, explicitApplyAuthorized: false } as any;
    const verification = { version: "1.0.0", verificationId: "fixture-post-verification", branch: "fixture-branch", passed: true, requiredCommandsPassed: true, commandCount: 0, commands: [], warnings: [] } as any;
    const review = { reviewId: "fixture-review", passed: true, repositoryRoot: ".", branch: "fixture-branch", changedPaths: [], unexpectedPaths: [], findings: [], diffSummary: "" } as any;

    return {
        understand: async () => { calls.push("understand"); return context; },
        plan: async (receivedContext) => { calls.push("plan"); assert.equal(receivedContext, context); return plan; },
        generateIntent: async (receivedPlan, receivedContext) => { calls.push("generate-intent"); assert.equal(receivedPlan, plan); assert.equal(receivedContext, context); return intent; },
        runArtifactPipeline: (receivedPlan, receivedIntent, approveProposal) => { calls.push("generate-artifacts"); assert.equal(receivedPlan, plan); assert.equal(receivedIntent, intent); return approveProposal ? { outcome: "ready", proposal, manifest, proposalApproved: true, repositoryWritesPerformed: false } as any : { outcome: "approval-required", proposal: { ...proposal, approved: false }, manifest: null, proposalApproved: false, repositoryWritesPerformed: false } as any; },
        executionVerification: async (receivedProposal, receivedManifest) => { calls.push("execution-verification"); assert.equal(receivedProposal, proposal); assert.equal(receivedManifest, manifest); return preVerification; },
        executionPackage: async (receivedProposal, receivedManifest, receivedVerification) => { calls.push("execution-package"); assert.equal(receivedProposal, proposal); assert.equal(receivedManifest, manifest); assert.equal(receivedVerification, preVerification); return executionPackage; },
        persistExecutionPackage: async (receivedPackage) => { calls.push("persist-execution-package"); assert.equal(receivedPackage, executionPackage); return persistedExecutionPackagePath; },
        execute: async (receivedPackagePath, mode) => { calls.push("execute"); assert.equal(receivedPackagePath, persistedExecutionPackagePath); assert.equal(mode, "dry-run"); return execution; },
        verify: async (receivedExecution) => { calls.push("verify"); assert.equal(receivedExecution, execution); return verification; },
        review: async (receivedVerification) => { calls.push("review"); assert.equal(receivedVerification, verification); return review; }
    };
}

test("composes typed authoritative handoffs through successful dry-run lifecycle", async () => {
    const calls: string[] = [];
    const dependencies = createFixtureDependencies(calls);
    const result = await orchestrateObjectiveRiverDev(dependencies, { mode: "dry-run", approveProposal: true });
    assert.equal(result.outcome, "completed");
    assert.equal(result.mode, "dry-run");
    assert.equal(result.blockedStage, null);
    assert.equal(result.warning, null);
    assert.deepEqual(result.completedStages, ["understand","plan","generate-intent","generate-artifacts","execution-verification","execution-package","persist-execution-package","execute","verify","review"]);
    assert.deepEqual(calls, ["understand","plan","generate-intent","generate-artifacts","execution-verification","execution-package","persist-execution-package","execute","verify","review"]);
    assert.equal(result.artifacts?.proposalApproved, true);
    assert.equal(result.executionVerification?.passed, true);
    assert.equal(result.verification?.passed, true);
    assert.equal(result.review?.passed, true);
});

test("requires explicit proposal approval before downstream execution lifecycle", async () => {
    const calls: string[] = [];
    const dependencies = createFixtureDependencies(calls);
    const result = await orchestrateObjectiveRiverDev(dependencies, { mode: "dry-run" });
    assert.equal(result.outcome, "blocked");
    assert.equal(result.blockedStage, "execution-verification");
    assert.match(result.warning ?? "", /proposal approval/i);
    assert.deepEqual(result.completedStages, ["understand","plan","generate-intent","generate-artifacts"]);
    assert.deepEqual(calls, ["understand","plan","generate-intent","generate-artifacts"]);
    assert.equal(result.artifacts?.proposalApproved, false);
    assert.equal(result.executionPackage, null);
    assert.equal(result.execution, null);
});

test("blocks execution-package creation when pre-execution verification fails", async () => {
    const calls: string[] = [];
    const baseDependencies = createFixtureDependencies(calls);
    const dependencies: RiverDevObjectiveOrchestrationDependencies = { ...baseDependencies, executionVerification: async () => { calls.push("execution-verification"); return { verificationId: "fixture-failed-pre-verification", passed: false, verifiedAt: null, commands: [], warnings: ["fixture failure"] } as any; } };
    const result = await orchestrateObjectiveRiverDev(dependencies, { mode: "dry-run", approveProposal: true });
    assert.equal(result.outcome, "blocked");
    assert.equal(result.blockedStage, "execution-package");
    assert.match(result.warning ?? "", /pre-execution verification/i);
    assert.equal(result.executionVerification?.passed, false);
    assert.equal(result.executionPackage, null);
    assert.equal(calls.includes("execution-package"), false);
});

test("failed post-execution verification stops before review and exposes unsupported repair boundary", async () => {
    const calls: string[] = [];
    const baseDependencies = createFixtureDependencies(calls);
    const dependencies: RiverDevObjectiveOrchestrationDependencies = { ...baseDependencies, verify: async (execution) => { calls.push("verify"); assert.ok(execution); return { version: "1.0.0", verificationId: "fixture-failed-verification", branch: "fixture-branch", passed: false, requiredCommandsPassed: false, commandCount: 1, commands: [], warnings: ["fixture failure"] } as any; } };
    const result = await orchestrateObjectiveRiverDev(dependencies, { mode: "dry-run", approveProposal: true });
    assert.equal(result.outcome, "blocked");
    assert.equal(result.blockedStage, "review");
    assert.match(result.warning ?? "", /Repair remains unsupported/);
    assert.equal(result.verification?.passed, false);
    assert.equal(result.review, null);
    assert.equal(calls.includes("review"), false);
});

test("apply remains fail-closed before invoking any lifecycle dependency", async () => {
    const calls: string[] = [];
    const dependencies = createFixtureDependencies(calls);
    const result = await orchestrateObjectiveRiverDev(dependencies, { mode: "apply", approveProposal: true });
    assert.equal(result.outcome, "blocked");
    assert.equal(result.mode, "apply");
    assert.equal(result.blockedStage, "execute");
    assert.match(result.warning ?? "", /separately governed execution authorization/i);
    assert.deepEqual(result.completedStages, []);
    assert.deepEqual(calls, []);
    assert.equal(result.executionPackage, null);
    assert.equal(result.execution, null);
});

test("session-backed production lifecycle persists completion and evidence", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "river-dev-orchestrate-objective-"));
    await initializeTemporaryGitRepository(repositoryRoot);

    try {
        const dependencies = createFixtureDependencies([]);
        const result = await orchestrateProductionObjectiveRiverDev(
            {
                configuration: { repositoryRoot } as RiverDevConfiguration,
                specificationPath: ".river-dev/specifications/orchestrate-001.json",
                dependencies
            },
            {
                mode: "dry-run",
                approveProposal: true,
                startedAt: "2026-08-31T12:00:00.000Z"
            }
        );

        assert.equal(result.orchestration.outcome, "completed");
        assert.equal(result.sessionCompleted, true);
        assert.notEqual(result.sessionId, "");
        assert.equal(result.completionEvidence.length, 5);
        assert.ok(result.completionEvidence.some((entry) => entry === `session:${result.sessionId}`));

        const persisted = JSON.parse(
            await readFile(join(repositoryRoot, ".river-dev", "state", "river-dev-state.json"), "utf8")
        ) as { activeSession: unknown; completedSessions: Array<{ sessionId: string; status: string; currentStep: string }> };

        assert.equal(persisted.activeSession, null);
        assert.equal(persisted.completedSessions.length, 1);
        assert.equal(persisted.completedSessions[0]?.sessionId, result.sessionId);
        assert.equal(persisted.completedSessions[0]?.status, "completed");
        assert.equal(persisted.completedSessions[0]?.currentStep, "completed");
    } finally {
        await rm(repositoryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
});

test("session-backed production lifecycle persists blocked resumable state", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "river-dev-orchestrate-objective-"));
    await initializeTemporaryGitRepository(repositoryRoot);

    try {
        const dependencies = createFixtureDependencies([]);
        const result = await orchestrateProductionObjectiveRiverDev(
            {
                configuration: { repositoryRoot } as RiverDevConfiguration,
                specificationPath: ".river-dev/specifications/orchestrate-001.json",
                dependencies
            },
            {
                mode: "dry-run",
                approveProposal: false,
                startedAt: "2026-08-31T12:00:00.000Z"
            }
        );

        assert.equal(result.orchestration.outcome, "blocked");
        assert.equal(result.sessionCompleted, false);
        assert.deepEqual(result.completionEvidence, []);

        const persisted = JSON.parse(
            await readFile(join(repositoryRoot, ".river-dev", "state", "river-dev-state.json"), "utf8")
        ) as { activeSession: { sessionId: string; status: string; resume: { resumable: boolean } } | null; completedSessions: unknown[] };

        assert.equal(persisted.activeSession?.sessionId, result.sessionId);
        assert.equal(persisted.activeSession?.status, "blocked");
        assert.equal(persisted.activeSession?.resume.resumable, true);
        assert.equal(persisted.completedSessions.length, 0);
    } finally {
        await rm(repositoryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
});

test("apply remains fail-closed without creating session state", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "river-dev-orchestrate-objective-"));
    await initializeTemporaryGitRepository(repositoryRoot);

    try {
        const dependencies = createFixtureDependencies([]);
        const result = await orchestrateProductionObjectiveRiverDev(
            {
                configuration: { repositoryRoot } as RiverDevConfiguration,
                specificationPath: ".river-dev/specifications/orchestrate-001.json",
                dependencies
            },
            { mode: "apply", approveProposal: true }
        );

        assert.equal(result.orchestration.outcome, "blocked");
        assert.equal(result.sessionId, "");
        assert.equal(result.sessionCompleted, false);
        await assert.rejects(readFile(join(repositoryRoot, ".river-dev", "state", "river-dev-state.json"), "utf8"));
    } finally {
        await rm(repositoryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
});

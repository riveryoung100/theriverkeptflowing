import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";

import {
    loadRiverDevConfiguration
} from "../core/config";

import {
    planRiverDevPhase
} from "./plan";


const repositoryRoot =
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        ".."
    );

const specificationPath =
    resolve(
        repositoryRoot,
        ".river-dev",
        "specifications",
        "plan-001-architecture-grounded-production-planning-integration.json"
    );


test(
    "grounds the production governed plan in authoritative development context",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const generatedAt =
            "2026-08-30T03:00:00.000Z";

        const first =
            await planRiverDevPhase(
                configuration,
                specificationPath,
                generatedAt
            );

        const second =
            await planRiverDevPhase(
                configuration,
                specificationPath,
                generatedAt
            );

        assert.deepEqual(
            first,
            second
        );

        assert.ok(
            first.planningIntelligence
        );

        const intelligence =
            first.planningIntelligence;

        assert.ok(
            intelligence.decisions.length > 0
        );

        for (
            const decision of
            intelligence.decisions
        ) {

            assert.equal(
                first.allowedPaths.includes(
                    decision.path
                ),
                true
            );

            assert.equal(
                first.excludedPaths.includes(
                    decision.path
                ),
                false
            );

        }

        assert.equal(
            first.phase,
            "PLAN-001"
        );

        assert.equal(
            first.branch,
            "plan-001-architecture-grounded-production-planning-integration"
        );

    }
);

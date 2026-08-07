import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevRepositoryDiscoveryReport
} from "../types";

import {
    formatRepositoryDiscoveryReport
} from "./discover-repository";


function createReport():
RiverDevRepositoryDiscoveryReport {

    return {

        version:
            "1.0.0",

        repositoryRoot:
            "C:/repo",

        projectName:
            "The River Kept Flowing",

        branch:
            "dev-18-repository-discovery",

        commit:
            "1234567890123456789012345678901234567890",

        discoveredAt:
            "2026-08-07T15:10:00.000Z",

        entries: [
            {
                path:
                    ".river-dev",
                kind:
                    "directory",
                classification:
                    "river-dev",
                protected:
                    false
            },
            {
                path:
                    "src",
                kind:
                    "directory",
                classification:
                    "source",
                protected:
                    false
            },
            {
                path:
                    "src/index.ts",
                kind:
                    "file",
                classification:
                    "source",
                protected:
                    false
            },
            {
                path:
                    "src/index.test.ts",
                kind:
                    "file",
                classification:
                    "test",
                protected:
                    false
            },
            {
                path:
                    "docs",
                kind:
                    "directory",
                classification:
                    "documentation",
                protected:
                    false
            },
            {
                path:
                    "package.json",
                kind:
                    "file",
                classification:
                    "configuration",
                protected:
                    false
            },
            {
                path:
                    "node_modules",
                kind:
                    "directory",
                classification:
                    "protected",
                protected:
                    true
            }
        ],

        counts: {
            total:
                7,
            files:
                3,
            directories:
                4,
            protected:
                1
        },

        keyPaths: {
            developmentAgent:
                "tools/river-dev",
            documentation:
                "docs",
            publicApplication:
                "src"
        }

    };

}


test(
    "formats repository identity and counts",
    () => {

        const output =
            formatRepositoryDiscoveryReport(
                createReport()
            );

        assert.match(
            output,
            /River Development Agent Repository Discovery/
        );

        assert.match(
            output,
            /Project: The River Kept Flowing/
        );

        assert.match(
            output,
            /Branch: dev-18-repository-discovery/
        );

        assert.match(
            output,
            /Total entries: 7/
        );

        assert.match(
            output,
            /Files: 3/
        );

        assert.match(
            output,
            /Directories: 4/
        );

        assert.match(
            output,
            /Protected entries: 1/
        );

    }
);


test(
    "formats repository classifications",
    () => {

        const output =
            formatRepositoryDiscoveryReport(
                createReport()
            );

        assert.match(
            output,
            /River Dev: 1/
        );

        assert.match(
            output,
            /Source: 2/
        );

        assert.match(
            output,
            /Tests: 1/
        );

        assert.match(
            output,
            /Documentation: 1/
        );

        assert.match(
            output,
            /Configuration: 1/
        );

        assert.match(
            output,
            /Protected: 1/
        );

    }
);


test(
    "formats configured key paths deterministically",
    () => {

        const output =
            formatRepositoryDiscoveryReport(
                createReport()
            );

        const developmentAgentIndex =
            output.indexOf(
                "- developmentAgent: tools/river-dev"
            );

        const documentationIndex =
            output.indexOf(
                "- documentation: docs"
            );

        const publicApplicationIndex =
            output.indexOf(
                "- publicApplication: src"
            );

        assert.equal(
            developmentAgentIndex >=
                0,
            true
        );

        assert.equal(
            documentationIndex >
                developmentAgentIndex,
            true
        );

        assert.equal(
            publicApplicationIndex >
                documentationIndex,
            true
        );

    }
);

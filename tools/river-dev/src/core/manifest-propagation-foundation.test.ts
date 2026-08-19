import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import {
    createManifestPropagationFoundation
} from "./manifest-propagation-foundation";


function createManifest(): RiverDevImplementationManifest {
    return {
        version:
            "1.0.0",

        implementationId:
            "implementation:dev-326-test",

        planId:
            "plan:dev-326-test",

        branch:
            "dev-326-river-development-agent-manifest-propagation-foundation",

        description:
            "DEV-326 manifest propagation test.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "generated/dev-326-example.txt",

                content:
                    "DEV-326 deterministic manifest content.\n",

                overwrite:
                    true
            },
            {
                type:
                    "write-file",

                path:
                    "generated/dev-326-second.txt",

                content:
                    "Second deterministic operation.\n",

                overwrite:
                    false
            }
        ]
    };
}


test(
    "propagates an available implementation manifest without semantic mutation",
    () => {

        const manifest =
            createManifest();

        const result =
            createManifestPropagationFoundation({
                manifest,
                manifestAvailable:
                    true
            });

        assert.equal(
            result.version,
            "DEV-326"
        );

        assert.equal(
            result.source,
            "manifest-propagation-foundation"
        );

        assert.equal(
            result.propagationState,
            "MANIFEST_PROPAGATION_READY"
        );

        assert.equal(
            result.manifestAvailable,
            true
        );

        assert.equal(
            result.eligibleForDownstreamPropagation,
            true
        );

        assert.strictEqual(
            result.manifest,
            manifest
        );

        assert.deepEqual(
            result.manifest,
            manifest
        );

        assert.deepEqual(
            result.blockedReasons,
            []
        );
    }
);


test(
    "preserves implementation identity and ordered operation semantics",
    () => {

        const manifest =
            createManifest();

        const result =
            createManifestPropagationFoundation({
                manifest,
                manifestAvailable:
                    true
            });

        assert.ok(
            result.manifest
        );

        assert.equal(
            result.manifest.implementationId,
            manifest.implementationId
        );

        assert.equal(
            result.manifest.planId,
            manifest.planId
        );

        assert.equal(
            result.manifest.branch,
            manifest.branch
        );

        assert.equal(
            result.manifest.description,
            manifest.description
        );

        assert.deepEqual(
            result.manifest.operations,
            manifest.operations
        );

        assert.equal(
            result.manifest.operations[0]?.content,
            manifest.operations[0]?.content
        );

        assert.equal(
            result.manifest.operations[0]?.overwrite,
            true
        );

        assert.equal(
            result.manifest.operations[1]?.overwrite,
            false
        );
    }
);


test(
    "blocks missing manifest instead of synthesizing one",
    () => {

        const result =
            createManifestPropagationFoundation({
                manifest:
                    null,

                manifestAvailable:
                    false
            });

        assert.equal(
            result.propagationState,
            "MANIFEST_PROPAGATION_BLOCKED"
        );

        assert.equal(
            result.manifestAvailable,
            false
        );

        assert.equal(
            result.eligibleForDownstreamPropagation,
            false
        );

        assert.equal(
            result.manifest,
            null
        );

        assert.deepEqual(
            result.blockedReasons,
            [
                "Implementation manifest is not available for downstream propagation.",
                "Implementation manifest was not provided."
            ]
        );
    }
);


test(
    "blocks inconsistent availability without propagating the manifest",
    () => {

        const manifest =
            createManifest();

        const result =
            createManifestPropagationFoundation({
                manifest,
                manifestAvailable:
                    false
            });

        assert.equal(
            result.propagationState,
            "MANIFEST_PROPAGATION_BLOCKED"
        );

        assert.equal(
            result.eligibleForDownstreamPropagation,
            false
        );

        assert.equal(
            result.manifest,
            null
        );

        assert.deepEqual(
            result.blockedReasons,
            [
                "Implementation manifest is not available for downstream propagation."
            ]
        );
    }
);


test(
    "is deterministic for identical inputs",
    () => {

        const manifest =
            createManifest();

        const input = {
            manifest,
            manifestAvailable:
                true
        } as const;

        const first =
            createManifestPropagationFoundation(
                input
            );

        const second =
            createManifestPropagationFoundation(
                input
            );

        assert.deepEqual(
            first,
            second
        );
    }
);


test(
    "creates, broadens, and consumes no authorization and performs no execution or mutation",
    () => {

        const result =
            createManifestPropagationFoundation({
                manifest:
                    createManifest(),

                manifestAvailable:
                    true
            });

        assert.equal(
            result.createsAuthorization,
            false
        );

        assert.equal(
            result.broadensAuthorization,
            false
        );

        assert.equal(
            result.consumesAuthorization,
            false
        );

        assert.equal(
            result.executesManifest,
            false
        );

        assert.equal(
            result.mutatesRepository,
            false
        );

        assert.equal(
            result.mayUseNetwork,
            false
        );

        assert.equal(
            result.mayInvokeShell,
            false
        );
    }
);

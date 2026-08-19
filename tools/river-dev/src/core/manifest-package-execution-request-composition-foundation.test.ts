import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevExecutionPackage
} from "./execution-package";

import {
    createManifestPropagationFoundation
} from "./manifest-propagation-foundation";

import {
    composeManifestPackageExecutionRequest
} from "./manifest-package-execution-request-composition-foundation";


function createPackage(): RiverDevExecutionPackage {

    return {
        version:
            "1.0.0",

        packageId:
            "execution-package:dev-327-test",

        planId:
            "plan:dev-327-test",

        branch:
            "dev-327-river-development-agent-manifest-package-execution-request-composition-foundation",

        state:
            "ready-for-implementation",

        proposal:
            {
                version:
                    "1.0.0",

                proposalId:
                    "proposal:dev-327-test",

                planId:
                    "plan:dev-327-test",

                branch:
                    "dev-327-river-development-agent-manifest-package-execution-request-composition-foundation",

                objective:
                    "Verify deterministic DEV-327 composition.",

                approved:
                    true,

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-327-test.txt",

                        content:
                            "DEV-327 deterministic content.\n",

                        overwrite:
                            false,

                        reason:
                            "DEV-327 composition test."
                    }
                ]
            },

        manifest:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:dev-327-test",

                planId:
                    "plan:dev-327-test",

                branch:
                    "dev-327-river-development-agent-manifest-package-execution-request-composition-foundation",

                description:
                    "DEV-327 deterministic composition test.",

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-327-test.txt",

                        content:
                            "DEV-327 deterministic content.\n",

                        overwrite:
                            false
                    }
                ]
            },

        verification:
            {
                verificationId:
                    "verification:dev-327-test",

                passed:
                    true,

                verifiedAt:
                    "2026-08-19T00:00:00.000Z",

                commands: [
                    "typecheck",
                    "tests"
                ],

                warnings:
                    []
            },

        implementationReady:
            true,

        implementationWritesPerformed:
            false
    };
}


test(
    "composes the existing package execution request from a successfully propagated manifest",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,
                executionPackage,
                mode:
                    "dry-run"
            });

        assert.equal(
            result.compositionState,
            "PACKAGE_EXECUTION_REQUEST_COMPOSED"
        );

        assert.equal(
            result.composed,
            true
        );

        assert.ok(
            result.request
        );

        assert.strictEqual(
            result.request.executionPackage,
            executionPackage
        );

        assert.strictEqual(
            result.request.executionPackage.manifest,
            manifestPropagation.manifest
        );

        assert.equal(
            result.request.mode,
            "dry-run"
        );

        assert.equal(
            result.request.operationExecutionAuthorization,
            null
        );

        assert.deepEqual(
            result.blockedReasons,
            []
        );
    }
);


test(
    "preserves existing governed operation execution authorization without creating authority",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const authorization = {
            authorizationState:
                "OPERATION_EXECUTION_AUTHORIZED"
        } as const;

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,
                executionPackage,
                mode:
                    "apply",

                operationExecutionAuthorization:
                    authorization
            });

        assert.ok(
            result.request
        );

        assert.strictEqual(
            result.request.operationExecutionAuthorization,
            authorization
        );

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
    }
);


test(
    "blocks composition when manifest propagation is unsuccessful",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    false
            });

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,
                executionPackage,
                mode:
                    "dry-run"
            });

        assert.equal(
            result.composed,
            false
        );

        assert.equal(
            result.compositionState,
            "PACKAGE_EXECUTION_REQUEST_BLOCKED"
        );

        assert.equal(
            result.request,
            null
        );

        assert.ok(
            result.blockedReasons.length > 0
        );
    }
);


test(
    "blocks composition when the execution package is absent",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,
                executionPackage:
                    null,

                mode:
                    "dry-run"
            });

        assert.equal(
            result.composed,
            false
        );

        assert.equal(
            result.request,
            null
        );

        assert.ok(
            result.blockedReasons.includes(
                "Execution package was not provided."
            )
        );
    }
);


test(
    "blocks a package whose manifest is not the propagated manifest",
    () => {

        const executionPackage =
            createPackage();

        const otherPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,

                executionPackage:
                    {
                        ...otherPackage,

                        manifest:
                            {
                                ...otherPackage.manifest
                            }
                    },

                mode:
                    "dry-run"
            });

        assert.equal(
            result.composed,
            false
        );

        assert.equal(
            result.request,
            null
        );

        assert.ok(
            result.blockedReasons.includes(
                "Execution package manifest is not the successfully propagated manifest."
            )
        );
    }
);


test(
    "is deterministic for equivalent input",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const input = {
            manifestPropagation,
            executionPackage,
            mode:
                "dry-run"
        } as const;

        const first =
            composeManifestPackageExecutionRequest(
                input
            );

        const second =
            composeManifestPackageExecutionRequest(
                input
            );

        assert.deepEqual(
            first,
            second
        );
    }
);


test(
    "performs no package execution or repository mutation",
    () => {

        const executionPackage =
            createPackage();

        const manifestPropagation =
            createManifestPropagationFoundation({
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            });

        const result =
            composeManifestPackageExecutionRequest({
                manifestPropagation,
                executionPackage,
                mode:
                    "dry-run"
            });

        assert.equal(
            result.executesPackage,
            false
        );

        assert.equal(
            result.mutatesRepository,
            false
        );
    }
);

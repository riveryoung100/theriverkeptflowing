import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevManifestPropagationFoundation
} from "../types";


export interface RiverDevManifestPropagationFoundationInput {
    readonly manifest:
        RiverDevImplementationManifest | null;

    readonly manifestAvailable:
        boolean;
}


export function createManifestPropagationFoundation(
    input:
        RiverDevManifestPropagationFoundationInput
): RiverDevManifestPropagationFoundation {

    const blockedReasons: string[] = [];

    if (!input.manifestAvailable) {
        blockedReasons.push(
            "Implementation manifest is not available for downstream propagation."
        );
    }

    if (input.manifest === null) {
        blockedReasons.push(
            "Implementation manifest was not provided."
        );
    }

    const eligibleForDownstreamPropagation =
        input.manifestAvailable &&
        input.manifest !== null;

    return {
        version:
            "DEV-326",

        source:
            "manifest-propagation-foundation",

        propagationState:
            eligibleForDownstreamPropagation
                ? "MANIFEST_PROPAGATION_READY"
                : "MANIFEST_PROPAGATION_BLOCKED",

        manifestAvailable:
            input.manifestAvailable,

        eligibleForDownstreamPropagation,

        manifest:
            eligibleForDownstreamPropagation
                ? input.manifest
                : null,

        blockedReasons,

        createsAuthorization:
            false,

        broadensAuthorization:
            false,

        consumesAuthorization:
            false,

        executesManifest:
            false,

        mutatesRepository:
            false,

        mayUseNetwork:
            false,

        mayInvokeShell:
            false
    };
}

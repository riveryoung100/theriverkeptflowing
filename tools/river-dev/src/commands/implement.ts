import type { RiverDevConfiguration } from "../types";

import {
    createImplementationRunner,
    loadImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationMode,
    RiverDevImplementationResult
} from "../execution/runner";


export async function implementRiverDevPlan(
    configuration: RiverDevConfiguration,
    manifestPath: string,
    mode: RiverDevImplementationMode =
        "dry-run"
): Promise<RiverDevImplementationResult> {

    const manifest =
        await loadImplementationManifest(
            manifestPath
        );

    if (mode === "apply") {
        throw new TypeError(
            "Legacy implement apply execution is disabled. Apply requires the governed execution-package lifecycle."
        );
    }

    const runner =
        createImplementationRunner(
            configuration
        );

    return runner.execute(
        manifest,
        "dry-run"
    );

}


export function getDefaultImplementationManifestPath(
    configuration:
        RiverDevConfiguration
): string {

    return (
        configuration.repositoryRoot +
        "/.river-dev/specifications/dev-07-implementation-manifest.json"
    );

}


export function formatImplementationResult(
    result:
        RiverDevImplementationResult
): string {

    return JSON.stringify(
        result,
        null,
        2
    );

}

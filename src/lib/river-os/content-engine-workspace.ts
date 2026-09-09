import type {
    RiverContentCatalogEntry
} from "./content-catalog";

export type RiverContentEngineStageId =
    | "transcript"
    | "transform"
    | "repurpose"
    | "publish";

export type RiverContentEngineStageState =
    | "ready"
    | "waiting";

export interface RiverContentEngineStage {
    id:
        RiverContentEngineStageId;
    label:
        string;
    description:
        string;
    state:
        RiverContentEngineStageState;
    stateLabel:
        string;
}

export interface RiverContentEngineWorkspace {
    sourceId:
        string;
    transcriptAvailable:
        boolean;
    stages:
        readonly RiverContentEngineStage[];
}

export function createRiverContentEngineWorkspace(
    entry:
        RiverContentCatalogEntry
): RiverContentEngineWorkspace {

    const transcriptAvailable =
        entry.transcriptState ===
        "available";

    return {
        sourceId:
            entry.sourceId,
        transcriptAvailable,
        stages: [
            {
                id:
                    "transcript",
                label:
                    "Transcript",
                description:
                    transcriptAvailable
                        ? "Transcript evidence is attached to this operational source record."
                        : "Transcript acquisition remains pending for this published source.",
                state:
                    transcriptAvailable
                        ? "ready"
                        : "waiting",
                stateLabel:
                    transcriptAvailable
                        ? "Available"
                        : "Pending"
            },
            {
                id:
                    "transform",
                label:
                    "Transform",
                description:
                    "Prepare governed source transformations without changing the canonical source record.",
                state:
                    transcriptAvailable
                        ? "ready"
                        : "waiting",
                stateLabel:
                    transcriptAvailable
                        ? "Ready"
                        : "Waiting for transcript"
            },
            {
                id:
                    "repurpose",
                label:
                    "Repurpose",
                description:
                    "Create downstream content plans for articles, clips, newsletters, guides, and platform-native assets.",
                state:
                    transcriptAvailable
                        ? "ready"
                        : "waiting",
                stateLabel:
                    transcriptAvailable
                        ? "Ready"
                        : "Waiting for transcript"
            },
            {
                id:
                    "publish",
                label:
                    "Publish",
                description:
                    "Publishing remains a separately governed operation and is not executed from this workspace yet.",
                state:
                    "waiting",
                stateLabel:
                    "Not connected"
            }
        ]
    };

}

import type {
    RiverContentCatalogEntry
} from "./content-catalog";


export interface RiverContentWorkspaceSummary {

    readonly totalSources:
        number;

    readonly transcriptPending:
        number;

    readonly transcriptAvailable:
        number;

    readonly platforms:
        number;

}


export function summarizeRiverContentWorkspace(
    entries:
        readonly RiverContentCatalogEntry[]
): RiverContentWorkspaceSummary {

    const platformNames =
        new Set(
            entries.map(
                (
                    entry
                ) =>
                    entry.platform
            )
        );

    let transcriptPending =
        0;

    let transcriptAvailable =
        0;

    for (
        const entry
        of entries
    ) {

        if (
            entry.transcriptState ===
            "available"
        ) {

            transcriptAvailable +=
                1;

        }
        else {

            transcriptPending +=
                1;

        }

    }

    return {
        totalSources:
            entries.length,

        transcriptPending,

        transcriptAvailable,

        platforms:
            platformNames.size
    };

}


export function formatRiverContentDate(
    value:
        string
): string {

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            month:
                "short",

            day:
                "numeric",

            year:
                "numeric"
        }
    ).format(
        date
    );

}


export function formatRiverContentPlatform(
    value:
        string
): string {

    if (
        value.length ===
        0
    ) {

        return value;

    }

    return (
        value
            .charAt(
                0
            )
            .toUpperCase() +
        value.slice(
            1
        )
    );

}
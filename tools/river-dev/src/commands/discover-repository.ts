import type {
    RiverDevConfiguration,
    RiverDevRepositoryDiscoveryReport,
    RiverDevRepositoryPathClassification
} from "../types";

import {
    discoverRepository
} from "../core/repository-discovery";


export async function discoverRiverDevRepository(
    configuration:
        RiverDevConfiguration,
    discoveredAt?:
        string
): Promise<RiverDevRepositoryDiscoveryReport> {

    return discoverRepository(
        configuration,
        discoveredAt
    );

}


function countClassification(
    report:
        RiverDevRepositoryDiscoveryReport,
    classification:
        RiverDevRepositoryPathClassification
): number {

    return report.entries.filter(
        (entry) => {
            return entry.classification ===
                classification;
        }
    )
        .length;

}


export function formatRepositoryDiscoveryReport(
    report:
        RiverDevRepositoryDiscoveryReport
): string {

    const lines = [

        "River Development Agent Repository Discovery",

        `Project: ${report.projectName}`,

        `Repository: ${report.repositoryRoot}`,

        `Branch: ${report.branch}`,

        `Commit: ${report.commit}`,

        `Discovered at: ${report.discoveredAt}`,

        `Total entries: ${report.counts.total}`,

        `Files: ${report.counts.files}`,

        `Directories: ${report.counts.directories}`,

        `Protected entries: ${report.counts.protected}`,

        "Classifications:",

        `- River Dev: ${countClassification(
            report,
            "river-dev"
        )}`,

        `- Source: ${countClassification(
            report,
            "source"
        )}`,

        `- Tests: ${countClassification(
            report,
            "test"
        )}`,

        `- Documentation: ${countClassification(
            report,
            "documentation"
        )}`,

        `- Configuration: ${countClassification(
            report,
            "configuration"
        )}`,

        `- Content: ${countClassification(
            report,
            "content"
        )}`,

        `- Public assets: ${countClassification(
            report,
            "public-asset"
        )}`,

        `- Infrastructure: ${countClassification(
            report,
            "infrastructure"
        )}`,

        `- Protected: ${countClassification(
            report,
            "protected"
        )}`,

        `- Other: ${countClassification(
            report,
            "other"
        )}`,

        "Key paths:"

    ];

    for (
        const [
            key,
            path
        ] of
        Object.entries(
            report.keyPaths
        )
    ) {

        lines.push(
            `- ${key}: ${path}`
        );

    }

    return lines.join(
        "\n"
    );

}

import type {
    LineageGraph,
    LineageNodeId
} from "./types";

export interface LineageValidationIssue {

    readonly code: string;

    readonly message: string;

}

export interface LineageValidationResult {

    readonly valid: boolean;

    readonly issues:
        readonly LineageValidationIssue[];

}

export function validateLineageGraph(
    graph: LineageGraph
): LineageValidationResult {

    const issues:
        LineageValidationIssue[] =
        [];

    const nodeIds =
        new Set(
            graph.nodes.map(
                node => node.id
            )
        );

    for (
        const edge of graph.edges
    ) {

        if (
            !nodeIds.has(
                edge.from
            )
        ) {

            issues.push({
                code:
                    "lineage.edge.from.missing",

                message:
                    `Unknown source node: ${edge.from}`
            });

        }

        if (
            !nodeIds.has(
                edge.to
            )
        ) {

            issues.push({
                code:
                    "lineage.edge.to.missing",

                message:
                    `Unknown destination node: ${edge.to}`
            });

        }

        if (
            edge.from ===
            edge.to
        ) {

            issues.push({
                code:
                    "lineage.edge.self",

                message:
                    "Lineage edges cannot reference themselves."
            });

        }

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}

export function hasNode(
    graph: LineageGraph,
    id: LineageNodeId
): boolean {

    return graph.nodes.some(
        node => node.id === id
    );

}

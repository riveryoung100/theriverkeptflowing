import type {
    LineageEdge,
    LineageGraph,
    LineageNodeId,
    LineageTraversalResult
} from "./types";

export function createLineageGraph(): LineageGraph {

    return {
        nodes: [],
        edges: []
    };

}

export function addNode(
    graph: LineageGraph,
    node: LineageGraph["nodes"][number]
): LineageGraph {

    return {

        ...graph,

        nodes: [
            ...graph.nodes,
            node
        ]

    };

}

export function addEdge(
    graph: LineageGraph,
    edge: LineageEdge
): LineageGraph {

    return {

        ...graph,

        edges: [
            ...graph.edges,
            edge
        ]

    };

}

export function findParents(
    graph: LineageGraph,
    id: LineageNodeId
): LineageTraversalResult {

    const visited =
        new Set<LineageNodeId>();

    const edges:
        LineageEdge[] =
        [];

    walkParents(
        graph,
        id,
        visited,
        edges
    );

    return {

        visited:
            [...visited],

        edges

    };

}

function walkParents(
    graph: LineageGraph,
    id: LineageNodeId,
    visited: Set<LineageNodeId>,
    edges: LineageEdge[]
): void {

    for (
        const edge of graph.edges
    ) {

        if (
            edge.to !== id
        ) {
            continue;
        }

        edges.push(
            edge
        );

        if (
            visited.has(
                edge.from
            )
        ) {
            continue;
        }

        visited.add(
            edge.from
        );

        walkParents(
            graph,
            edge.from,
            visited,
            edges
        );

    }

}

export function findChildren(
    graph: LineageGraph,
    id: LineageNodeId
): LineageTraversalResult {

    const visited =
        new Set<LineageNodeId>();

    const edges:
        LineageEdge[] =
        [];

    walkChildren(
        graph,
        id,
        visited,
        edges
    );

    return {

        visited:
            [...visited],

        edges

    };

}

function walkChildren(
    graph: LineageGraph,
    id: LineageNodeId,
    visited: Set<LineageNodeId>,
    edges: LineageEdge[]
): void {

    for (
        const edge of graph.edges
    ) {

        if (
            edge.from !== id
        ) {
            continue;
        }

        edges.push(
            edge
        );

        if (
            visited.has(
                edge.to
            )
        ) {
            continue;
        }

        visited.add(
            edge.to
        );

        walkChildren(
            graph,
            edge.to,
            visited,
            edges
        );

    }

}

export function hasCycle(
    graph: LineageGraph
): boolean {

    for (
        const node of graph.nodes
    ) {

        if (
            findChildren(
                graph,
                node.id
            ).visited.includes(
                node.id
            )
        ) {
            return true;
        }

    }

    return false;

}

import type {
  KnowledgeGraphPersistence,
} from "./persistence";

import type {
  KnowledgeQueryEngine,
  KnowledgeQueryRequest,
  KnowledgeQueryResult,
} from "./query";

export interface ProductionKnowledgeQueryExecutionService {
  execute(
    persistenceKey: string,
    request: KnowledgeQueryRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    queryEngine: Pick<KnowledgeQueryEngine, "query">,
  ): Promise<KnowledgeQueryResult>;
}

export class ProductionKnowledgeQueryExecution
implements ProductionKnowledgeQueryExecutionService {
  public async execute(
    persistenceKey: string,
    request: KnowledgeQueryRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    queryEngine: Pick<KnowledgeQueryEngine, "query">,
  ): Promise<KnowledgeQueryResult> {
    const graph =
      await persistence.retrieve(
        persistenceKey,
      );

    return queryEngine.query(
      graph,
      request,
    );
  }
}

export function createProductionKnowledgeQueryExecution():
ProductionKnowledgeQueryExecutionService {
  return new ProductionKnowledgeQueryExecution();
}

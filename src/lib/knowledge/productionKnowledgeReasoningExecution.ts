import type {
  KnowledgeGraphPersistence,
} from "./persistence";

import type {
  KnowledgeReasoningEngine,
  KnowledgeReasoningRequest,
  KnowledgeReasoningResult,
} from "./reasoning";

export interface ProductionKnowledgeReasoningExecutionService {
  execute(
    persistenceKey: string,
    request: KnowledgeReasoningRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    reasoningEngine: Pick<KnowledgeReasoningEngine, "reason">,
  ): Promise<KnowledgeReasoningResult>;
}

export class ProductionKnowledgeReasoningExecution
implements ProductionKnowledgeReasoningExecutionService {
  public async execute(
    persistenceKey: string,
    request: KnowledgeReasoningRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    reasoningEngine: Pick<KnowledgeReasoningEngine, "reason">,
  ): Promise<KnowledgeReasoningResult> {
    const graph =
      await persistence.retrieve(
        persistenceKey,
      );

    return reasoningEngine.reason(
      graph,
      request,
    );
  }
}

export function createProductionKnowledgeReasoningExecution():
ProductionKnowledgeReasoningExecutionService {
  return new ProductionKnowledgeReasoningExecution();
}

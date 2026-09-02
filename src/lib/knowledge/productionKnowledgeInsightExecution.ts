import type {
  KnowledgeGraphPersistence,
} from "./persistence";

import type {
  KnowledgeReasoningEngine,
  KnowledgeReasoningRequest,
} from "./reasoning";

import type {
  KnowledgeInsightEngine,
  KnowledgeInsightEngineResult,
  KnowledgeInsightRequest,
} from "./insight";

export type ProductionKnowledgeInsightRequest =
  Omit<KnowledgeInsightRequest, "reasoning">;

export interface ProductionKnowledgeInsightExecutionService {
  execute(
    persistenceKey: string,
    reasoningRequest: KnowledgeReasoningRequest,
    insightRequest: ProductionKnowledgeInsightRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    reasoningEngine: Pick<KnowledgeReasoningEngine, "reason">,
    insightEngine: Pick<KnowledgeInsightEngine, "create">,
  ): Promise<KnowledgeInsightEngineResult>;
}

export class ProductionKnowledgeInsightExecution
implements ProductionKnowledgeInsightExecutionService {
  public async execute(
    persistenceKey: string,
    reasoningRequest: KnowledgeReasoningRequest,
    insightRequest: ProductionKnowledgeInsightRequest,
    persistence: Pick<KnowledgeGraphPersistence, "retrieve">,
    reasoningEngine: Pick<KnowledgeReasoningEngine, "reason">,
    insightEngine: Pick<KnowledgeInsightEngine, "create">,
  ): Promise<KnowledgeInsightEngineResult> {
    const graph =
      await persistence.retrieve(
        persistenceKey,
      );

    const reasoning =
      reasoningEngine.reason(
        graph,
        reasoningRequest,
      );

    return insightEngine.create({
      ...insightRequest,
      reasoning,
    });
  }
}

export function createProductionKnowledgeInsightExecution():
ProductionKnowledgeInsightExecutionService {
  return new ProductionKnowledgeInsightExecution();
}
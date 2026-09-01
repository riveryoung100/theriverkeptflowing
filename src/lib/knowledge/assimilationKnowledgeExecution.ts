import {
  createKnowledgeRequestFromAssimilation,
} from "./assimilationKnowledgeMapper";

import {
  DeterministicKnowledgeEngine,
} from "./engine";

import type {
  AssetId,
} from "../assimilation/types";

import type {
  ProductionSourceAssimilationService,
} from "../assimilation/production/types";

import type {
  AssimilationKnowledgeInput,
} from "./assimilationKnowledgeMapper";

import type {
  KnowledgeGraphPersistence,
} from "./persistence";

import type {
  KnowledgeEngine,
  KnowledgeEngineResult,
} from "./types";

export interface AssimilationKnowledgeExecutionService {
  execute(
    input: AssimilationKnowledgeInput,
  ): KnowledgeEngineResult;

  executeFromProductionRecords(
    assetId: AssetId,
    assimilation: Pick<ProductionSourceAssimilationService, "retrieveGeneratedRecords">,
  ): Promise<KnowledgeEngineResult>;

  executeAndPersistFromProductionRecords(
    assetId: AssetId,
    persistenceKey: string,
    assimilation: Pick<ProductionSourceAssimilationService, "retrieveGeneratedRecords">,
    persistence: Pick<KnowledgeGraphPersistence, "persist">,
  ): Promise<KnowledgeEngineResult>;
}

export class AssimilationKnowledgeExecution
implements AssimilationKnowledgeExecutionService {
  private readonly knowledgeEngine: KnowledgeEngine;

  public constructor(
    knowledgeEngine: KnowledgeEngine =
      new DeterministicKnowledgeEngine(),
  ) {
    this.knowledgeEngine =
      knowledgeEngine;
  }

  public execute(
    input: AssimilationKnowledgeInput,
  ): KnowledgeEngineResult {
    const request =
      createKnowledgeRequestFromAssimilation(
        input,
      );

    return this.knowledgeEngine.build(
      request,
    );
  }

  public async executeFromProductionRecords(
    assetId: AssetId,
    assimilation: Pick<ProductionSourceAssimilationService, "retrieveGeneratedRecords">,
  ): Promise<KnowledgeEngineResult> {
    const records =
      await assimilation.retrieveGeneratedRecords(
        assetId,
      );

    return this.execute(records);
  }

  public async executeAndPersistFromProductionRecords(
    assetId: AssetId,
    persistenceKey: string,
    assimilation: Pick<ProductionSourceAssimilationService, "retrieveGeneratedRecords">,
    persistence: Pick<KnowledgeGraphPersistence, "persist">,
  ): Promise<KnowledgeEngineResult> {
    const result =
      await this.executeFromProductionRecords(
        assetId,
        assimilation,
      );

    await persistence.persist(
      persistenceKey,
      result.graph,
    );

    return result;
  }
}

export function createAssimilationKnowledgeExecution(
  knowledgeEngine?: KnowledgeEngine,
): AssimilationKnowledgeExecutionService {
  return new AssimilationKnowledgeExecution(
    knowledgeEngine,
  );
}

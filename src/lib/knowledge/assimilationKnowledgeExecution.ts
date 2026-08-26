import {
  createKnowledgeRequestFromAssimilation,
} from "./assimilationKnowledgeMapper";

import {
  DeterministicKnowledgeEngine,
} from "./engine";

import type {
  AssimilationKnowledgeInput,
} from "./assimilationKnowledgeMapper";

import type {
  KnowledgeEngine,
  KnowledgeEngineResult,
} from "./types";

export interface AssimilationKnowledgeExecutionService {
  execute(
    input: AssimilationKnowledgeInput,
  ): KnowledgeEngineResult;
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
}

export function createAssimilationKnowledgeExecution(
  knowledgeEngine?: KnowledgeEngine,
): AssimilationKnowledgeExecutionService {
  return new AssimilationKnowledgeExecution(
    knowledgeEngine,
  );
}

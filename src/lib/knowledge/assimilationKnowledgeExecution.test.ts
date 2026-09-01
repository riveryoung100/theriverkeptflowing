import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleTextAsset,
  sampleTextClassification,
  sampleTextExtraction,
  sampleTextTransformation,
  sampleTextSegment,
} from "../assimilation/fixtures/sampleTextAsset";

import {
  sampleDerivationResult,
} from "../assimilation/derivation/fixtures/sampleDerivation";

import {
  createAssimilationKnowledgeExecution,
} from "./assimilationKnowledgeExecution";

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
  KnowledgeEngineRequest,
  KnowledgeEngineResult,
} from "./types";

function createInput():
AssimilationKnowledgeInput {
  return {
    asset:
      sampleTextAsset,

    segment:
      sampleTextSegment,

    classification:
      sampleTextClassification,

    derivedObject:
      sampleDerivationResult.results[0]!.derivative,
  };
}

test(
  "executes assimilation-derived knowledge through the deterministic knowledge engine",
  () => {
    const input =
      createInput();

    const expectedRequest =
      createKnowledgeRequestFromAssimilation(
        input,
      );

    const expected =
      new DeterministicKnowledgeEngine()
        .build(
          expectedRequest,
        );

    const actual =
      createAssimilationKnowledgeExecution()
        .execute(
          input,
        );

    assert.deepEqual(
      actual,
      expected,
    );

    assert.equal(
      actual.graph.nodes.length,
      1,
    );

    assert.equal(
      actual.graph.nodes[0]?.provenance.sources[0]?.assetId,
      sampleTextAsset.id,
    );

    assert.equal(
      actual.graph.nodes[0]?.provenance.sources[0]?.derivativeId,
      sampleDerivationResult.results[0]!.derivative.id,
    );

    assert.deepEqual(
      actual.graph.nodes[0]?.provenance.sources[0]?.segmentIds,
      [
        sampleTextSegment.id,
      ],
    );

    assert.deepEqual(
      actual.graph.nodes[0]?.provenance.sources[0]?.classificationIds,
      [
        sampleTextClassification.id,
      ],
    );

    assert.deepEqual(
      actual.graph.nodes[0]?.provenance.sources[0]?.transformationIds,
      [
        sampleDerivationResult.results[0]!.derivative.transformationId,
      ],
    );
  },
);

test(
  "passes the mapped request to an injected knowledge engine exactly once",
  () => {
    const input =
      createInput();

    const expectedRequest =
      createKnowledgeRequestFromAssimilation(
        input,
      );

    let calls =
      0;

    let capturedRequest:
      KnowledgeEngineRequest | undefined;

    const expectedResult =
      new DeterministicKnowledgeEngine()
        .build(
          expectedRequest,
        );

    const knowledgeEngine:
    KnowledgeEngine = {
      build(
        request: KnowledgeEngineRequest,
      ): KnowledgeEngineResult {
        calls += 1;

        capturedRequest =
          request;

        return expectedResult;
      },
    };

    const actual =
      createAssimilationKnowledgeExecution(
        knowledgeEngine,
      ).execute(
        input,
      );

    assert.equal(
      calls,
      1,
    );

    assert.deepEqual(
      capturedRequest,
      expectedRequest,
    );

    assert.deepEqual(
      actual,
      expectedResult,
    );
  },
);

test(
  "is deterministic for equivalent assimilation input",
  () => {
    const service =
      createAssimilationKnowledgeExecution();

    const first =
      service.execute(
        createInput(),
      );

    const second =
      service.execute(
        createInput(),
      );

    assert.deepEqual(
      second,
      first,
    );
  },
);

test(
  "executes authoritative production assimilation records through the existing knowledge boundary",
  async () => {
    const input = createInput();
    let retrievalCalls = 0;
    const assimilation = {
      async retrieveGeneratedRecords(assetId: import("../assimilation/types").AssetId) {
        retrievalCalls += 1;
        assert.equal(assetId, input.asset.id);
        return {
          asset: input.asset,
          extraction: sampleTextExtraction,
          segment: input.segment,
          classification: input.classification,
          transformation: sampleTextTransformation,
          derivedObject: input.derivedObject,
        };
      },
    };

    const actual =
      await createAssimilationKnowledgeExecution()
        .executeFromProductionRecords(
          input.asset.id,
          assimilation,
        );

    const expected =
      createAssimilationKnowledgeExecution()
        .execute(input);

    assert.equal(retrievalCalls, 1);
    assert.deepEqual(actual, expected);
    const source = actual.graph.nodes[0]?.provenance.sources[0];
    assert.equal(source?.assetId, input.asset.id);
    assert.equal(source?.derivativeId, input.derivedObject.id);
    assert.deepEqual(source?.segmentIds, [input.segment.id]);
    assert.deepEqual(source?.classificationIds, [input.classification.id]);
    assert.deepEqual(source?.transformationIds, [input.derivedObject.transformationId]);
  },
);

test(
  "propagates authoritative production assimilation retrieval failure without executing knowledge",
  async () => {
    const input = createInput();
    let knowledgeCalls = 0;
    const knowledgeEngine = {
      build() {
        knowledgeCalls += 1;
        throw new Error("knowledge must not execute");
      },
    };
    const retrievalFailure = new Error("authoritative retrieval failed");
    const assimilation = {
      async retrieveGeneratedRecords() {
        throw retrievalFailure;
      },
    };

    await assert.rejects(
      () =>
        createAssimilationKnowledgeExecution(knowledgeEngine)
          .executeFromProductionRecords(
            input.asset.id,
            assimilation,
          ),
      (error: unknown) => error === retrievalFailure,
    );

    assert.equal(knowledgeCalls, 0);
  },
);

test(
  "persists successful production knowledge execution under the exact caller-supplied key",
  async () => {
    const input = createInput();
    const persistenceKey = "knowledge-production-test";
    let retrievalCalls = 0;
    let persistenceCalls = 0;
    let capturedKey: string | undefined;
    let capturedGraph: KnowledgeEngineResult["graph"] | undefined;

    const assimilation = {
      async retrieveGeneratedRecords(assetId: import("../assimilation/types").AssetId) {
        retrievalCalls += 1;
        assert.equal(assetId, input.asset.id);

        return {
          asset: input.asset,
          extraction: sampleTextExtraction,
          segment: input.segment,
          classification: input.classification,
          transformation: sampleTextTransformation,
          derivedObject: input.derivedObject,
        };
      },
    };

    const persistence = {
      async persist(
        key: string,
        graph: KnowledgeEngineResult["graph"],
      ) {
        persistenceCalls += 1;
        capturedKey = key;
        capturedGraph = graph;
      },
    };

    const expected =
      createAssimilationKnowledgeExecution()
        .execute(input);

    const actual =
      await createAssimilationKnowledgeExecution()
        .executeAndPersistFromProductionRecords(
          input.asset.id,
          persistenceKey,
          assimilation,
          persistence,
        );

    assert.equal(retrievalCalls, 1);
    assert.equal(persistenceCalls, 1);
    assert.equal(capturedKey, persistenceKey);
    assert.deepEqual(capturedGraph, expected.graph);
    assert.deepEqual(actual, expected);
  },
);

test(
  "does not execute knowledge or persist when authoritative production retrieval fails",
  async () => {
    const input = createInput();
    let knowledgeCalls = 0;
    let persistenceCalls = 0;
    const retrievalFailure = new Error("authoritative retrieval failed");

    const knowledgeEngine = {
      build(): KnowledgeEngineResult {
        knowledgeCalls += 1;
        throw new Error("knowledge must not execute");
      },
    };

    const assimilation = {
      async retrieveGeneratedRecords() {
        throw retrievalFailure;
      },
    };

    const persistence = {
      async persist() {
        persistenceCalls += 1;
      },
    };

    await assert.rejects(
      () =>
        createAssimilationKnowledgeExecution(knowledgeEngine)
          .executeAndPersistFromProductionRecords(
            input.asset.id,
            "knowledge-production-test",
            assimilation,
            persistence,
          ),
      (error: unknown) => error === retrievalFailure,
    );

    assert.equal(knowledgeCalls, 0);
    assert.equal(persistenceCalls, 0);
  },
);

test(
  "does not persist when knowledge execution fails",
  async () => {
    const input = createInput();
    let persistenceCalls = 0;
    const knowledgeFailure = new Error("knowledge execution failed");

    const knowledgeEngine = {
      build(): KnowledgeEngineResult {
        throw knowledgeFailure;
      },
    };

    const assimilation = {
      async retrieveGeneratedRecords() {
        return {
          asset: input.asset,
          extraction: sampleTextExtraction,
          segment: input.segment,
          classification: input.classification,
          transformation: sampleTextTransformation,
          derivedObject: input.derivedObject,
        };
      },
    };

    const persistence = {
      async persist() {
        persistenceCalls += 1;
      },
    };

    await assert.rejects(
      () =>
        createAssimilationKnowledgeExecution(knowledgeEngine)
          .executeAndPersistFromProductionRecords(
            input.asset.id,
            "knowledge-production-test",
            assimilation,
            persistence,
          ),
      (error: unknown) => error === knowledgeFailure,
    );

    assert.equal(persistenceCalls, 0);
  },
);

test(
  "propagates knowledge persistence failure after successful production execution",
  async () => {
    const input = createInput();
    let persistenceCalls = 0;
    const persistenceFailure = new Error("knowledge persistence failed");

    const assimilation = {
      async retrieveGeneratedRecords() {
        return {
          asset: input.asset,
          extraction: sampleTextExtraction,
          segment: input.segment,
          classification: input.classification,
          transformation: sampleTextTransformation,
          derivedObject: input.derivedObject,
        };
      },
    };

    const persistence = {
      async persist() {
        persistenceCalls += 1;
        throw persistenceFailure;
      },
    };

    await assert.rejects(
      () =>
        createAssimilationKnowledgeExecution()
          .executeAndPersistFromProductionRecords(
            input.asset.id,
            "knowledge-production-test",
            assimilation,
            persistence,
          ),
      (error: unknown) => error === persistenceFailure,
    );

    assert.equal(persistenceCalls, 1);
  },
);

import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleTextAsset,
  sampleTextClassification,
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

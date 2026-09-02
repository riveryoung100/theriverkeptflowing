import assert from "node:assert/strict";
import test from "node:test";

import {
  sampleKnowledgeGraph,
} from "./fixtures/sampleKnowledge";

import {
  sampleInsightRequest,
} from "./insight/fixtures/sampleInsight";

import {
  sampleSupportPathRequest,
} from "./reasoning/fixtures/sampleReasoning";

import {
  createProductionKnowledgeInsightExecution,
} from "./productionKnowledgeInsightExecution";

import type {
  KnowledgeGraph,
} from "./types";

import type {
  KnowledgeReasoningEngine,
  KnowledgeReasoningRequest,
  KnowledgeReasoningResult,
} from "./reasoning";

import type {
  KnowledgeInsightEngine,
  KnowledgeInsightEngineResult,
  KnowledgeInsightRequest,
} from "./insight";

const insightRequest = {
  type: sampleInsightRequest.type,
  title: sampleInsightRequest.title,
  requestedAt: sampleInsightRequest.requestedAt,
  minimumConfidence: sampleInsightRequest.minimumConfidence,
  requireEvidence: sampleInsightRequest.requireEvidence,
};

test(
  "retrieves the exact durable graph, executes exact reasoning, and creates insight from that reasoning result",
  async () => {
    const persistenceKey =
      "knowledge-insight-production-test";

    let retrievalCalls = 0;
    let reasoningCalls = 0;
    let insightCalls = 0;
    let capturedKey:
      string | undefined;
    let capturedGraph:
      KnowledgeGraph | undefined;
    let capturedReasoningRequest:
      KnowledgeReasoningRequest | undefined;
    let capturedInsightRequest:
      KnowledgeInsightRequest | undefined;

    const persistence = {
      async retrieve(
        key: string,
      ): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        capturedKey = key;
        return sampleKnowledgeGraph;
      },
    };

    const reasoningResult =
      sampleInsightRequest.reasoning;

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(
        graph: KnowledgeGraph,
        request: KnowledgeReasoningRequest,
      ): KnowledgeReasoningResult {
        reasoningCalls += 1;
        capturedGraph = graph;
        capturedReasoningRequest = request;
        return reasoningResult;
      },
    };

    const expected:
      KnowledgeInsightEngineResult = {
        insight: {
          ...sampleInsightRequest.reasoning.evidence.nodes.length >= 0
            ? {
                id: "insight:production-test",
                type: sampleInsightRequest.type,
                title: sampleInsightRequest.title,
                summary: reasoningResult.explanation,
                conclusion: reasoningResult.conclusion,
                confidence: 1,
                evidence: {
                  nodeIds: [],
                  relationIds: [],
                  claimIds: [],
                },
                explanation: reasoningResult.explanation,
                status: "active",
                reviewStatus: "not-required",
                createdAt: sampleInsightRequest.requestedAt,
                version: 1,
                schemaVersion: "1.0.0",
              }
            : neverValue(),
        },
        warnings: [],
      };

    const insightEngine:
    KnowledgeInsightEngine = {
      create(
        request: KnowledgeInsightRequest,
      ): KnowledgeInsightEngineResult {
        insightCalls += 1;
        capturedInsightRequest = request;
        return expected;
      },
    };

    const actual =
      await createProductionKnowledgeInsightExecution()
        .execute(
          persistenceKey,
          sampleSupportPathRequest,
          insightRequest,
          persistence,
          reasoningEngine,
          insightEngine,
        );

    assert.equal(retrievalCalls, 1);
    assert.equal(reasoningCalls, 1);
    assert.equal(insightCalls, 1);
    assert.equal(capturedKey, persistenceKey);
    assert.equal(capturedGraph, sampleKnowledgeGraph);
    assert.equal(
      capturedReasoningRequest,
      sampleSupportPathRequest,
    );
    assert.equal(
      capturedInsightRequest?.reasoning,
      reasoningResult,
    );
    assert.equal(
      capturedInsightRequest?.type,
      insightRequest.type,
    );
    assert.equal(
      capturedInsightRequest?.title,
      insightRequest.title,
    );
    assert.equal(actual, expected);
  },
);

test(
  "does not execute reasoning or insight creation when durable graph retrieval fails",
  async () => {
    let reasoningCalls = 0;
    let insightCalls = 0;
    const retrievalFailure =
      new Error("durable knowledge retrieval failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        throw retrievalFailure;
      },
    };

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(): KnowledgeReasoningResult {
        reasoningCalls += 1;
        throw new Error("reasoning must not execute");
      },
    };

    const insightEngine:
    KnowledgeInsightEngine = {
      create(): KnowledgeInsightEngineResult {
        insightCalls += 1;
        throw new Error("insight must not execute");
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeInsightExecution()
          .execute(
            "knowledge-insight-production-test",
            sampleSupportPathRequest,
            insightRequest,
            persistence,
            reasoningEngine,
            insightEngine,
          ),
      (error: unknown) =>
        error === retrievalFailure,
    );

    assert.equal(reasoningCalls, 0);
    assert.equal(insightCalls, 0);
  },
);

test(
  "does not create insight when reasoning fails",
  async () => {
    let retrievalCalls = 0;
    let insightCalls = 0;
    const reasoningFailure =
      new Error("knowledge reasoning failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        return sampleKnowledgeGraph;
      },
    };

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(): KnowledgeReasoningResult {
        throw reasoningFailure;
      },
    };

    const insightEngine:
    KnowledgeInsightEngine = {
      create(): KnowledgeInsightEngineResult {
        insightCalls += 1;
        throw new Error("insight must not execute");
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeInsightExecution()
          .execute(
            "knowledge-insight-production-test",
            sampleSupportPathRequest,
            insightRequest,
            persistence,
            reasoningEngine,
            insightEngine,
          ),
      (error: unknown) =>
        error === reasoningFailure,
    );

    assert.equal(retrievalCalls, 1);
    assert.equal(insightCalls, 0);
  },
);

test(
  "propagates insight failure unchanged after one retrieval and one reasoning execution",
  async () => {
    let retrievalCalls = 0;
    let reasoningCalls = 0;
    let insightCalls = 0;
    const insightFailure =
      new Error("knowledge insight failed");

    const persistence = {
      async retrieve(): Promise<KnowledgeGraph> {
        retrievalCalls += 1;
        return sampleKnowledgeGraph;
      },
    };

    const reasoningEngine:
    KnowledgeReasoningEngine = {
      reason(): KnowledgeReasoningResult {
        reasoningCalls += 1;
        return sampleInsightRequest.reasoning;
      },
    };

    const insightEngine:
    KnowledgeInsightEngine = {
      create(): KnowledgeInsightEngineResult {
        insightCalls += 1;
        throw insightFailure;
      },
    };

    await assert.rejects(
      () =>
        createProductionKnowledgeInsightExecution()
          .execute(
            "knowledge-insight-production-test",
            sampleSupportPathRequest,
            insightRequest,
            persistence,
            reasoningEngine,
            insightEngine,
          ),
      (error: unknown) =>
        error === insightFailure,
    );

    assert.equal(retrievalCalls, 1);
    assert.equal(reasoningCalls, 1);
    assert.equal(insightCalls, 1);
  },
);

function neverValue(): never {
  throw new Error("unreachable");
}
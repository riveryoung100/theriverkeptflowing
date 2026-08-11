import type {
  RiverDevControlledExecutorCapability,
  RiverDevControlledExecutorCapabilityAuthorizationFoundation,
  RiverDevControlledExecutorCapabilityAuthorizationFoundationInput
} from "../types";

const VERSION = "DEV-248";

const SOURCE =
  "river-development-agent-controlled-executor-capability-authorization-foundation";

const OBJECTIVE =
  "Derive a deterministic fail-closed capability authorization decision from a trusted ready DEV-247 controlled executor capability foundation without performing execution.";

const AUTHORIZATION_BOUNDARIES = [
  "capability authorization is deny by default",
  "capability authorization requires trusted DEV-247 capability evidence",
  "capability authorization requires ready DEV-247 capability evidence",
  "capability authorization requires preserved authorization evidence",
  "capability authorization requires executor admission",
  "capability authorization requires an unblocked predecessor record",
  "capability authorization requires governed execution-request evidence",
  "capability authorization requires eligible capability evidence",
  "only DEV-247 eligible capabilities may be authorized",
  "capability authorization cannot create new capabilities",
  "capability authorization does not grant command execution authority",
  "capability authorization does not grant repository modification authority",
  "capability authorization does not grant repository deletion authority",
  "capability authorization does not grant commit authority",
  "capability authorization does not grant push authority",
  "capability authorization does not grant deployment authority",
  "capability authorization does not grant secret access authority",
  "capability authorization does not grant autonomous execution authority"
] as const;

const SCOPE_BOUNDARIES = [
  "capability authorization remains bound to inherited approved execution scope",
  "capability authorization cannot expand approved execution scope",
  "capability authorization cannot expand DEV-247 capability eligibility"
] as const;

function normalizeStrings(
  values: readonly string[]
): readonly string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).sort();
}

function normalizeCapabilities(
  values: readonly RiverDevControlledExecutorCapability[]
): readonly RiverDevControlledExecutorCapability[] {
  return Array.from(new Set(values)).sort();
}

export function buildControlledExecutorCapabilityAuthorizationFoundation(
  input: RiverDevControlledExecutorCapabilityAuthorizationFoundationInput
): RiverDevControlledExecutorCapabilityAuthorizationFoundation {

  const capabilityFoundation =
    input.capabilityFoundation;

  const authorizationRequest =
    input.authorizationRequest;

  const eligibleCapabilities =
    normalizeCapabilities(
      capabilityFoundation.eligibleCapabilities
    );

  const requestedCapabilities =
    normalizeCapabilities(
      authorizationRequest.requestedCapabilities
    );

  const authorizationEvidence =
    normalizeStrings(
      authorizationRequest.authorizationEvidence
    );

  const executionRequest =
    normalizeStrings(
      capabilityFoundation.executionRequest
    );

  const blockedReasons: string[] = [];

  if (capabilityFoundation.trusted !== true) {
    blockedReasons.push(
      "DEV-247 capability foundation is not trusted"
    );
  }

  if (capabilityFoundation.ready !== true) {
    blockedReasons.push(
      "DEV-247 capability foundation is not ready"
    );
  }

  if (capabilityFoundation.authorized !== true) {
    blockedReasons.push(
      "DEV-247 authorization evidence is not preserved"
    );
  }

  if (capabilityFoundation.executorAdmitted !== true) {
    blockedReasons.push(
      "DEV-247 executor admission is not preserved"
    );
  }

  if (capabilityFoundation.defaultPolicy !== "DENY") {
    blockedReasons.push(
      "DEV-247 capability policy is not deny by default"
    );
  }

  if (
    capabilityFoundation.capabilityEligibilityOnly !==
    true
  ) {
    blockedReasons.push(
      "DEV-247 capability semantics are not eligibility only"
    );
  }

  if (capabilityFoundation.blockedReasons.length > 0) {
    blockedReasons.push(
      "DEV-247 capability foundation contains blocked reasons"
    );
  }

  if (executionRequest.length === 0) {
    blockedReasons.push(
      "governed execution request evidence is missing"
    );
  }

  if (eligibleCapabilities.length === 0) {
    blockedReasons.push(
      "eligible capability evidence is missing"
    );
  }

  if (requestedCapabilities.length === 0) {
    blockedReasons.push(
      "capability authorization request is empty"
    );
  }

  if (authorizationEvidence.length === 0) {
    blockedReasons.push(
      "capability authorization evidence is missing"
    );
  }

  const eligibleCapabilitySet =
    new Set<RiverDevControlledExecutorCapability>(
      eligibleCapabilities
    );

  const requestedButIneligible =
    requestedCapabilities.filter(
      (capability) =>
        !eligibleCapabilitySet.has(capability)
    );

  for (const capability of requestedButIneligible) {
    blockedReasons.push(
      `requested capability is not eligible: ${capability}`
    );
  }

  const normalizedBlockedReasons =
    normalizeStrings(blockedReasons);

  const authorizationPrerequisitesSatisfied =
    normalizedBlockedReasons.length === 0;

  const authorizedCapabilities =
    authorizationPrerequisitesSatisfied
      ? requestedCapabilities.filter(
          (capability) =>
            eligibleCapabilitySet.has(capability)
        )
      : [];

  const authorizedCapabilitySet =
    new Set<RiverDevControlledExecutorCapability>(
      authorizedCapabilities
    );

  const deniedCapabilities =
    requestedCapabilities.filter(
      (capability) =>
        !authorizedCapabilitySet.has(capability)
    );

  const authorized =
    authorizationPrerequisitesSatisfied &&
    authorizedCapabilities.length > 0;

  const ready =
    authorized;

  const trusted =
    capabilityFoundation.trusted === true &&
    normalizedBlockedReasons.length === 0;

  const authorizationState =
    normalizeStrings([
      "authorization policy: DENY",
      "authorization semantics: DECISION ONLY",
      `authorization evidence count: ${authorizationEvidence.length}`,
      `eligible capability count: ${eligibleCapabilities.length}`,
      `requested capability count: ${requestedCapabilities.length}`,
      `authorized capability count: ${authorizedCapabilities.length}`,
      `denied capability count: ${deniedCapabilities.length}`,
      `authorization decision: ${authorized ? "AUTHORIZED" : "DENIED"}`
    ]);

  const provenance =
    normalizeStrings([
      ...capabilityFoundation.provenance,
      ...authorizationEvidence,
      `source:${SOURCE}`,
      `version:${VERSION}`
    ]);

  return {
    version: VERSION,
    source: SOURCE,
    objective: OBJECTIVE,

    trusted,
    ready,
    authorized,
    executorAdmitted:
      capabilityFoundation.executorAdmitted === true,

    defaultPolicy: "DENY",
    authorizationDecisionOnly: true,

    capabilityFoundation,
    authorizationRequest,

    executionRequest,

    eligibleCapabilities,
    requestedCapabilities,
    authorizedCapabilities,
    deniedCapabilities,

    authorizationState,

    provenance,
    authorizationBoundaries:
      [...AUTHORIZATION_BOUNDARIES],
    scopeBoundaries:
      [...SCOPE_BOUNDARIES],

    blockedReasons:
      normalizedBlockedReasons
  };
}

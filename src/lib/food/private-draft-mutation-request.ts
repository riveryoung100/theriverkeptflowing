import { parseFoodRecipeId, validateFoodVersion, validateFoodRecipeDraft, validateFoodProductDraft } from "./draft-domain";
import type { FoodPrivateDraftOperationGate } from "./private-draft-service";
import { FOOD_WORKSPACE_FEEDBACK, type FoodPrivateDraftWorkspaceController } from "./private-draft-workspace";

export interface FoodMutationRequestEnvelope {
    readonly method: string;
    readonly origin: string | null;
    readonly contentType: string | null;
    readonly contentLength?: string;
    readonly readBody: () => AsyncIterable<Uint8Array>;
}
export const FOOD_MUTATION_TRANSPORT_MESSAGES = Object.freeze({
    "method-not-allowed": "Private food mutations require POST.",
    "origin-rejected": "Private food request origin is not permitted.",
    "unsupported-content-type": "Private food request content type is not supported.",
    "payload-too-large": "Private food request exceeds the permitted limits.",
    "invalid-request": "The private food request is invalid.",
    "body-unavailable": "Private food request body could not be read.",
});
type TransportCode = keyof typeof FOOD_MUTATION_TRANSPORT_MESSAGES;
type MutationResult = Awaited<ReturnType<FoodPrivateDraftWorkspaceController["createInitialRecipe"]>> | Awaited<ReturnType<FoodPrivateDraftWorkspaceController["createInitialProduct"]>>;
type Failure = Readonly<{ ok: false; error: Readonly<{ code: TransportCode | "callback-failed" | keyof typeof FOOD_WORKSPACE_FEEDBACK; message: string }> }>;
export type FoodMutationRequestResult = MutationResult | Failure;
class ParseFailure extends Error { constructor(readonly code: TransportCode) { super(code); } }
function fail(code: TransportCode): Failure { return Object.freeze({ ok: false, error: Object.freeze({ code, message: FOOD_MUTATION_TRANSPORT_MESSAGES[code] }) }); }
function invalid(): never { throw new ParseFailure("invalid-request"); }
function bound(condition: boolean): void { if (!condition) throw new ParseFailure("payload-too-large"); }
const encoder = new TextEncoder();
function origin(value: unknown): boolean {
    if (typeof value !== "string") return false;
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && url.origin === value; } catch { return false; }
}
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
    return value as Record<string, unknown>;
}

/** Bounded recursive-descent JSON, retaining numeric spelling for every version property. */
function snapshotJson(source: string): unknown {
    let at = 0, nodes = 0;
    const whitespace = () => { while (/[\x20\t\r\n]/.test(source[at] ?? "!")) at++; };
    function string(): string {
        const start = at++; let ended = false;
        while (at < source.length) {
            const char = source[at++];
            if (char === '"') { ended = true; break; }
            if (char === "\\") { at++; }
        }
        if (!ended) return invalid();
        let value: unknown;
        try { value = JSON.parse(source.slice(start, at)); } catch { return invalid(); }
        if (typeof value !== "string") return invalid();
        bound(value.length <= 4096); return value;
    }
    function value(depth: number, version = false): unknown {
        whitespace(); bound(++nodes <= 2048);
        const char = source[at];
        if (char === "{" || char === "[") {
            if (version) return invalid();
            bound(depth <= 12); at++; whitespace();
            if (char === "[") {
                const values: unknown[] = [];
                if (source[at] === "]") { at++; return values; }
                while (true) {
                    bound(values.length < 100); values.push(value(depth + 1)); whitespace();
                    if (source[at] === "]") { at++; return values; }
                    if (source[at++] !== ",") return invalid();
                }
            }
            const result = Object.create(null) as Record<string, unknown>; const seen = new Set<string>();
            if (source[at] === "}") { at++; return result; }
            while (true) {
                whitespace(); if (source[at] !== '"') return invalid(); const key = string();
                if (seen.has(key) || ["__proto__", "constructor", "prototype"].includes(key)) return invalid(); seen.add(key);
                whitespace(); if (source[at++] !== ":") return invalid();
                result[key] = value(depth + 1, key === "version"); whitespace();
                if (source[at] === "}") { at++; return result; }
                if (source[at++] !== ",") return invalid();
            }
        }
        if (char === '"') { if (version) return invalid(); return string(); }
        const token = /^(?:-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null)/.exec(source.slice(at))?.[0];
        if (!token) return invalid(); at += token.length;
        if (version && (!/^[1-9][0-9]*$/.test(token) || !Number.isSafeInteger(Number(token)))) return invalid();
        return JSON.parse(token);
    }
    const parsed = value(1); whitespace(); if (at !== source.length) return invalid(); return object(parsed);
}
async function read(envelope: FoodMutationRequestEnvelope): Promise<Uint8Array> {
    let iterator: AsyncIterator<Uint8Array>;
    try { iterator = envelope.readBody()[Symbol.asyncIterator](); } catch { throw new ParseFailure("body-unavailable"); }
    const chunks: Uint8Array[] = []; let count = 0, complete = false;
    try {
        while (true) {
            let next: IteratorResult<Uint8Array>;
            try { next = await iterator.next(); } catch { throw new ParseFailure("body-unavailable"); }
            if (next.done) { complete = true; break; }
            if (!(next.value instanceof Uint8Array)) return invalid();
            count += next.value.byteLength; bound(count <= 65536); chunks.push(next.value.slice());
        }
    } finally { if (!complete) { try { await iterator.return?.(); } catch { /* Preserve the original bounded failure. */ } } }
    const result = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
}
function form(bytes: Uint8Array): Record<string, string> {
    let text: string; try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return invalid(); }
    const segments = text.split("&"); bound(segments.length <= 3);
    const fields: Record<string, string> = Object.create(null);
    const decode = (part: string) => { try { return decodeURIComponent(part.replace(/\+/g, " ")); } catch { return invalid(); } };
    for (const segment of segments) {
        const equal = segment.indexOf("="); if (equal <= 0) return invalid();
        const name = decode(segment.slice(0, equal)); const content = decode(segment.slice(equal + 1));
        if (!["operation", "snapshot", "expectedPreviousVersion"].includes(name) || Object.hasOwn(fields, name)) return invalid(); fields[name] = content;
    }
    if (!Object.hasOwn(fields, "operation") || !Object.hasOwn(fields, "snapshot")) return invalid();
    bound(fields.operation.length <= 32); bound(encoder.encode(fields.snapshot).length <= 49152);
    return fields;
}

/** Trusted dependencies only. Strict Origin enforcement must survive later route integration. */
export function createPrivateFoodDraftMutationRequestBoundary(input: {
    readonly gate: FoodPrivateDraftOperationGate;
    readonly controller: FoodPrivateDraftWorkspaceController;
    readonly expectedOrigin: string;
}) {
    return Object.freeze({
        async submit(envelope: FoodMutationRequestEnvelope): Promise<FoodMutationRequestResult> {
            try {
                if (envelope.method !== "POST") return fail("method-not-allowed");
                if (!origin(input.expectedOrigin) || !origin(envelope.origin) || envelope.origin !== input.expectedOrigin) return fail("origin-rejected");
                if (typeof envelope.contentType !== "string" || !/^application\/x-www-form-urlencoded(?:\s*;\s*charset\s*=\s*(?:UTF-8|"UTF-8"))?$/i.test(envelope.contentType)) return fail("unsupported-content-type");
                if (envelope.contentLength !== undefined) {
                    if (typeof envelope.contentLength !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(envelope.contentLength) || !Number.isSafeInteger(Number(envelope.contentLength))) return fail("invalid-request");
                    if (Number(envelope.contentLength) > 65536) return fail("payload-too-large");
                }
            } catch { return fail("invalid-request"); }
            const gated = await input.gate.runAuthorized(async (): Promise<FoodMutationRequestResult> => {
                let fields: Record<string, string>, parsed: unknown, predecessor: number | undefined;
                try {
                    fields = form(await read(envelope));
                    const operations = ["createInitialRecipe", "appendRecipeRevision", "createInitialProduct", "appendProductRevision"];
                    if (!operations.includes(fields.operation)) return invalid();
                    const revision = fields.operation.startsWith("append");
                    if (revision !== Object.hasOwn(fields, "expectedPreviousVersion")) return invalid();
                    if (revision) {
                        bound(fields.expectedPreviousVersion.length <= 16);
                        if (!/^[1-9][0-9]*$/.test(fields.expectedPreviousVersion)) return invalid();
                        try { predecessor = validateFoodVersion(Number(fields.expectedPreviousVersion)); } catch { return invalid(); }
                    }
                    parsed = snapshotJson(fields.snapshot);
                } catch (error) { if (error instanceof ParseFailure) return fail(error.code); throw error; }
                const domainFailure = () => Object.freeze({ ok: false as const, error: Object.freeze({ code: "invalid-input" as const, message: FOOD_WORKSPACE_FEEDBACK["invalid-input"] }) });
                if (fields.operation === "createInitialRecipe" || fields.operation === "appendRecipeRevision") {
                    let snapshot; try { snapshot = validateFoodRecipeDraft(parsed); } catch { return domainFailure(); }
                    return fields.operation === "createInitialRecipe" ? input.controller.createInitialRecipe(snapshot) : input.controller.appendRecipeRevision(snapshot, predecessor!);
                }
                let referenceId, referenceVersion;
                try { const reference = object(object(parsed).recipe); referenceId = parseFoodRecipeId(reference.id); referenceVersion = validateFoodVersion(reference.version); } catch { return domainFailure(); }
                const recipe = await input.controller.getRecipe(referenceId, referenceVersion);
                if (!recipe.ok) return recipe;
                if (recipe.value.outcome === "not-found") return domainFailure();
                let snapshot; try { snapshot = validateFoodProductDraft(parsed, recipe.value.snapshot); } catch { return domainFailure(); }
                return fields.operation === "createInitialProduct" ? input.controller.createInitialProduct(snapshot) : input.controller.appendProductRevision(snapshot, predecessor!);
            });
            if (!gated.ok) return gated;
            const result = gated.value;
            if (!result.ok && result.error.code in FOOD_WORKSPACE_FEEDBACK) {
                const code = result.error.code as keyof typeof FOOD_WORKSPACE_FEEDBACK;
                return Object.freeze({ ok: false, error: Object.freeze({ code, message: FOOD_WORKSPACE_FEEDBACK[code] }) });
            }
            return result;
        },
    });
}

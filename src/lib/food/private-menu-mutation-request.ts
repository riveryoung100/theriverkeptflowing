import type { FoodPrivateMenuOperationGate, FoodMenuServiceErrorCode } from "./private-menu-service";
import { FOOD_MENU_WORKSPACE_FEEDBACK, type FoodPrivateMenuWorkspaceController } from "./private-menu-workspace";

export interface FoodMenuMutationRequestEnvelope {
    readonly method: string;
    readonly origin: string | null;
    readonly contentType: string | null;
    readonly contentLength?: string;
    readonly readBody: () => AsyncIterable<Uint8Array>;
}
export interface FoodMenuMutationRequestBoundaryInput {
    readonly operationGate: FoodPrivateMenuOperationGate;
    readonly workspace: FoodPrivateMenuWorkspaceController;
    readonly expectedOrigin: string;
}
export interface FoodMenuMutationRequestBoundary {
    submit(envelope: FoodMenuMutationRequestEnvelope): Promise<FoodMenuMutationRequestResult>;
}
export const FOOD_MENU_MUTATION_TRANSPORT_MESSAGES = Object.freeze({
    "method-not-allowed": "Private food menu mutations require POST.",
    "origin-rejected": "Private food menu request origin is not permitted.",
    "unsupported-content-type": "Private food menu request content type is not supported.",
    "payload-too-large": "Private food menu request exceeds the permitted limits.",
    "invalid-request": "The private food menu request is invalid.",
    "body-unavailable": "Private food menu request body could not be read.",
});
export type FoodMenuMutationTransportErrorCode = keyof typeof FOOD_MENU_MUTATION_TRANSPORT_MESSAGES;
type MutationResult = Awaited<ReturnType<FoodPrivateMenuWorkspaceController["createInitialPresentation"]>> | Awaited<ReturnType<FoodPrivateMenuWorkspaceController["createInitialOffer"]>> | Awaited<ReturnType<FoodPrivateMenuWorkspaceController["createInitialPublication"]>> | Awaited<ReturnType<FoodPrivateMenuWorkspaceController["createInitialAvailability"]>>;
type Failure = Readonly<{ ok: false; error: Readonly<{ code: FoodMenuMutationTransportErrorCode | "callback-failed" | FoodMenuServiceErrorCode; message: string }> }>;
export type FoodMenuMutationRequestResult = MutationResult | Failure;
const ENCODED_BYTES = 33554432, SNAPSHOT_BYTES = 25165824;
class ParseFailure extends Error {
    constructor(readonly code: FoodMenuMutationTransportErrorCode) { super(code); }
}
function failure(code: Failure["error"]["code"]): Failure {
    const message = code === "callback-failed" ? "Private food menu operation could not be completed." : Object.hasOwn(FOOD_MENU_MUTATION_TRANSPORT_MESSAGES, code) ? FOOD_MENU_MUTATION_TRANSPORT_MESSAGES[code as FoodMenuMutationTransportErrorCode] : FOOD_MENU_WORKSPACE_FEEDBACK[code as FoodMenuServiceErrorCode];
    return Object.freeze({ ok: false, error: Object.freeze({ code, message }) });
}
function invalid(): never { throw new ParseFailure("invalid-request"); }
function bound(condition: boolean): void { if (!condition) throw new ParseFailure("payload-too-large"); }
function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
    const own = Reflect.ownKeys(value);
    if (required.some(k => !own.includes(k)) || own.some(k => typeof k !== "string" || ![...required, ...optional].includes(k))) throw new TypeError();
}
function canonicalOrigin(value: unknown): boolean {
    if (typeof value !== "string") return false;
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && url.origin === value; } catch { return false; }
}
function decimal(value: string): number {
    if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) return invalid();
    return Number(value);
}

/** Decode keys before checking duplicates; preserve numeric token spelling before conversion. */
function snapshotJson(source: string): unknown {
    let at = 0, nodes = 0;
    const tokenPattern = /(?:-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null)/y;
    const whitespace = () => { while (/[\x20\t\r\n]/.test(source[at] ?? "!")) at++; };
    function string(): string {
        const start = at++; let ended = false, units = 0;
        while (at < source.length) {
            const char = source[at++];
            if (char === '"') { ended = true; break; }
            if (char === "\\") { if (source[at] === "u") at += 5; else at++; }
            bound(++units <= 65536);
        }
        if (!ended) return invalid();
        let decoded: unknown;
        try { decoded = JSON.parse(source.slice(start, at)); } catch { return invalid(); }
        if (typeof decoded !== "string") return invalid();
        return decoded;
    }
    function value(depth: number, integer = false): unknown {
        whitespace(); bound(++nodes <= 1000000);
        const char = source[at];
        if (char === "{" || char === "[") {
            if (integer) return invalid();
            bound(depth <= 12); at++; whitespace();
            if (char === "[") {
                const values: unknown[] = [];
                if (source[at] === "]") { at++; return values; }
                while (true) {
                    bound(values.length < 40000); values.push(value(depth + 1)); whitespace();
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
                result[key] = value(depth + 1, ["version", "revision", "minimum", "maximum"].includes(key)); whitespace();
                if (source[at] === "}") { at++; return result; }
                if (source[at++] !== ",") return invalid();
            }
        }
        if (char === '"') { if (integer) return invalid(); return string(); }
        tokenPattern.lastIndex = at;
        const token = tokenPattern.exec(source)?.[0];
        if (!token) return invalid(); at += token.length;
        if (integer) return decimal(token);
        return JSON.parse(token);
    }
    const parsed = value(1); whitespace();
    if (at !== source.length || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) return invalid();
    return parsed;
}
async function read(envelope: FoodMenuMutationRequestEnvelope): Promise<Uint8Array> {
    let iterator: AsyncIterator<Uint8Array>;
    try { iterator = envelope.readBody()[Symbol.asyncIterator](); } catch { throw new ParseFailure("body-unavailable"); }
    const chunks: Uint8Array[] = []; let count = 0, complete = false;
    let block: Uint8Array | undefined, filled = 0;
    try {
        while (true) {
            let next: IteratorResult<Uint8Array>;
            try { next = await iterator.next(); } catch { throw new ParseFailure("body-unavailable"); }
            try {
                if (!next || typeof next !== "object" || (next.done !== undefined && typeof next.done !== "boolean")) return invalid();
                if (next.done) { complete = true; break; }
                const chunk = next.value;
                if (!(chunk instanceof Uint8Array)) return invalid();
                count += chunk.byteLength; bound(count <= ENCODED_BYTES);
                // Bounded blocks avoid retaining one allocation per tiny or empty chunk.
                let offset = 0;
                while (offset < chunk.length) {
                    if (!block) { block = new Uint8Array(65536); filled = 0; }
                    const amount = Math.min(block.length - filled, chunk.length - offset);
                    block.set(chunk.subarray(offset, offset + amount), filled); filled += amount; offset += amount;
                    if (filled === block.length) { chunks.push(block); block = undefined; }
                }
            } catch (error) { if (error instanceof ParseFailure) throw error; return invalid(); }
        }
    } finally { if (!complete) { try { await iterator.return?.(); } catch { /* Keep the original failure. */ } } }
    if (block) chunks.push(block.subarray(0, filled));
    const bytes = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
}
function form(bytes: Uint8Array): Record<string, string> {
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return invalid(); }
    // Stop field scanning before allocating an attacker-controlled segment array.
    const fields: Record<string, string> = Object.create(null); let at = 0, count = 0;
    const decode = (part: string) => { try { return decodeURIComponent(part.replace(/\+/g, " ")); } catch { return invalid(); } };
    while (true) {
        if (++count > 3) return invalid();
        const amp = text.indexOf("&", at), end = amp === -1 ? text.length : amp;
        const equal = text.indexOf("=", at); if (equal <= at || equal >= end) return invalid();
        const name = decode(text.slice(at, equal));
        if (!["operation", "snapshot", "expectedPreviousVersion", "expectedPreviousRevision"].includes(name) || Object.hasOwn(fields, name)) return invalid();
        fields[name] = decode(text.slice(equal + 1, end));
        if (amp === -1) break; at = amp + 1;
    }
    if (!Object.hasOwn(fields, "operation") || !Object.hasOwn(fields, "snapshot")) return invalid();
    bound(fields.operation.length <= 32);
    bound(new TextEncoder().encode(fields.snapshot).byteLength <= SNAPSHOT_BYTES);
    return fields;
}
function detached(value: unknown): unknown {
    if (value === null || typeof value !== "object") {
        if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) throw new TypeError();
        return value;
    }
    if (Array.isArray(value)) return Object.freeze(value.map(detached));
    const result: Record<string, unknown> = {};
    for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key)) throw new TypeError();
        Object.defineProperty(result, key, { value: detached((value as Record<string, unknown>)[key]), enumerable: true });
    }
    return Object.freeze(result);
}
function mutationResult(raw: unknown, publication: boolean): FoodMenuMutationRequestResult {
    try {
        const result = record(raw);
        if (result.ok === false) {
            keys(result, ["ok", "error"]); const error = record(result.error); keys(error, ["code", "message"]);
            if (typeof error.code !== "string" || !Object.hasOwn(FOOD_MENU_WORKSPACE_FEEDBACK, error.code) || typeof error.message !== "string") throw new TypeError();
            return failure(error.code as FoodMenuServiceErrorCode);
        }
        keys(result, ["ok", "value"]); if (result.ok !== true) throw new TypeError(); const value = record(result.value);
        if (typeof value.message !== "string") throw new TypeError();
        if (value.outcome === "conflict") { keys(value, ["outcome", "message"]); return Object.freeze({ ok: true, value: Object.freeze({ outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." }) }); }
        keys(value, ["outcome", "snapshot", "message"], publication ? ["publicationLabel"] : []);
        if (value.outcome !== "created" && value.outcome !== "already-present") throw new TypeError(); record(value.snapshot);
        const snapshot = detached(value.snapshot);
        let label: "Publication snapshot: published" | "Publication snapshot: unpublished" | undefined;
        if (publication) {
            const state = record(snapshot).state;
            label = state === "published" ? "Publication snapshot: published" : state === "unpublished" ? "Publication snapshot: unpublished" : undefined;
            if (!label || value.publicationLabel !== label) throw new TypeError();
        }
        return Object.freeze({ ok: true, value: Object.freeze({ outcome: value.outcome, snapshot, message: value.outcome === "created" ? "Snapshot recorded." : "Identical snapshot already recorded.", ...(label ? { publicationLabel: label } : {}) }) }) as MutationResult;
    } catch { return failure("storage"); }
}

/** Gate protects consumption; the delegated mutation independently protects persistence. */
export function createPrivateFoodMenuMutationRequestBoundary(input: FoodMenuMutationRequestBoundaryInput): Readonly<FoodMenuMutationRequestBoundary> {
    const { operationGate, workspace, expectedOrigin } = input;
    return Object.freeze({ async submit(envelope: FoodMenuMutationRequestEnvelope): Promise<FoodMenuMutationRequestResult> {
        try {
            if (envelope.method !== "POST") return failure("method-not-allowed");
            const origin = envelope.origin;
            if (!canonicalOrigin(expectedOrigin) || !canonicalOrigin(origin) || origin !== expectedOrigin) return failure("origin-rejected");
            const type = envelope.contentType;
            if (typeof type !== "string" || !/^application\/x-www-form-urlencoded(?:\s*;\s*charset\s*=\s*(?:UTF-8|"UTF-8"))?$/i.test(type)) return failure("unsupported-content-type");
            const length = envelope.contentLength;
            if (length !== undefined) {
                if (typeof length !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(length) || !Number.isSafeInteger(Number(length))) return failure("invalid-request");
                if (Number(length) > ENCODED_BYTES) return failure("payload-too-large");
            }
        } catch { return failure("invalid-request"); }
        // This local identity prevents an injected malformed gate from manufacturing a result.
        let callbackResult: FoodMenuMutationRequestResult | undefined;
        try {
            const gated = await operationGate.runAuthorized(async (): Promise<FoodMenuMutationRequestResult> => {
                let fields: Record<string, string>, snapshot: unknown, predecessor: number | undefined;
                try {
                    fields = form(await read(envelope));
                    const operation = fields.operation;
                    const initial = ["createInitialPresentation", "createInitialOffer", "createInitialPublication", "createInitialAvailability"].includes(operation);
                    const revision = ["appendPresentationRevision", "appendOfferRevision", "appendPublicationRevision", "appendAvailabilityRevision"].includes(operation);
                    if (!initial && !revision) return invalid();
                    const field = operation === "appendAvailabilityRevision" ? "expectedPreviousRevision" : "expectedPreviousVersion";
                    if (initial ? Object.hasOwn(fields, "expectedPreviousVersion") || Object.hasOwn(fields, "expectedPreviousRevision") : !Object.hasOwn(fields, field) || Object.hasOwn(fields, field === "expectedPreviousVersion" ? "expectedPreviousRevision" : "expectedPreviousVersion")) return invalid();
                    if (revision) { bound(fields[field].length <= 16); predecessor = decimal(fields[field]); }
                    snapshot = snapshotJson(fields.snapshot);
                } catch (error) {
                    if (!(error instanceof ParseFailure)) throw error;
                    callbackResult = failure(error.code); return callbackResult;
                }
                // Candidates remain untrusted: existing service/repository validates after fresh authorization.
                let result: unknown;
                switch (fields.operation) {
                    case "createInitialPresentation": result = await workspace.createInitialPresentation(snapshot as Parameters<typeof workspace.createInitialPresentation>[0]); break;
                    case "appendPresentationRevision": result = await workspace.appendPresentationRevision(snapshot as Parameters<typeof workspace.appendPresentationRevision>[0], predecessor!); break;
                    case "createInitialOffer": result = await workspace.createInitialOffer(snapshot as Parameters<typeof workspace.createInitialOffer>[0]); break;
                    case "appendOfferRevision": result = await workspace.appendOfferRevision(snapshot as Parameters<typeof workspace.appendOfferRevision>[0], predecessor!); break;
                    case "createInitialPublication": result = await workspace.createInitialPublication(snapshot as Parameters<typeof workspace.createInitialPublication>[0]); break;
                    case "appendPublicationRevision": result = await workspace.appendPublicationRevision(snapshot as Parameters<typeof workspace.appendPublicationRevision>[0], predecessor!); break;
                    case "createInitialAvailability": result = await workspace.createInitialAvailability(snapshot as Parameters<typeof workspace.createInitialAvailability>[0]); break;
                    case "appendAvailabilityRevision": result = await workspace.appendAvailabilityRevision(snapshot as Parameters<typeof workspace.appendAvailabilityRevision>[0], predecessor!); break;
                    default: return invalid();
                }
                callbackResult = mutationResult(result, fields.operation.includes("Publication")); return callbackResult;
            });
            const result = record(gated);
            if (result.ok === true) { keys(result, ["ok", "value"]); if (!callbackResult || result.value !== callbackResult) throw new TypeError(); return callbackResult; }
            keys(result, ["ok", "error"]); if (result.ok !== false) throw new TypeError(); const error = record(result.error); keys(error, ["code", "message"]);
            if (!["unauthenticated", "forbidden", "access-unavailable", "callback-failed"].includes(error.code as string) || typeof error.message !== "string") throw new TypeError();
            return failure(error.code as "unauthenticated" | "forbidden" | "access-unavailable" | "callback-failed");
        } catch { return failure("callback-failed"); }
    } });
}

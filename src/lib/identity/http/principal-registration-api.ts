import type { IdentityRegistrationService } from "../authentication/registration-service";
import { isValidRegistrationPassword } from "../authentication/registration-service";
import { normalizeCredentialEmail } from "../credentials/validation";
import { parsePrincipalId } from "../identifiers";

export interface RegistrationPasswordChecker {
  check(password: string): Promise<"allowed" | "rejected" | "unavailable">;
}
export interface RegistrationAbuseControl {
  check(request: Request): Promise<"allowed" | "denied" | "unavailable">;
}
export interface IdentityRegistrationRequestHandlerInput {
  readonly registration: IdentityRegistrationService;
  readonly expectedOrigin: string;
  readonly compromisedPasswords: RegistrationPasswordChecker;
  readonly abuseControl: RegistrationAbuseControl;
  readonly acquireWorkSlot: () => (() => void) | null;
  readonly scheduleTimeout: (callback: () => void, milliseconds: number) => (() => void);
}
export type IdentityRegistrationRequestHandler = (request: Request) => Promise<Response>;
const errors = {
  "method-not-allowed": [405, "Registration requires POST."],
  "origin-rejected": [403, "Registration request was rejected."],
  "unsupported-content-type": [415, "Registration requires JSON."],
  "payload-too-large": [413, "Registration request is too large."],
  "invalid-input": [400, "Registration input is invalid."],
  "password-rejected": [400, "Choose a different password."],
  "rate-limited": [429, "Registration is temporarily limited. Try again later."],
  unavailable: [503, "Registration is temporarily unavailable."],
} as const;
type ErrorCode = keyof typeof errors;
function response(body: unknown, status: number): Response {
  const headers = new Headers({ "cache-control": "no-store", "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  if (status === 405) headers.set("allow", "POST");
  if (status === 429) headers.set("retry-after", "60");
  return new Response(JSON.stringify(body), { status, headers });
}
function failure(code: ErrorCode): Response {
  return response({ ok: false, error: { code, message: errors[code][1] } }, errors[code][0]);
}
function acknowledgement(): Response {
  return response({ ok: true, message: "Registration request processed. Continue to sign in." }, 202);
}
class InputFailure extends Error {
  constructor(readonly code: ErrorCode) { super(code); }
}
function invalid(): never { throw new InputFailure("invalid-input"); }
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  return object(value) && Reflect.ownKeys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
}
function origin(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.origin === value; } catch { return false; }
}
/** Only flat string pairs are scanned; decoded names are checked before insertion. */
function parseBody(text: string): { email: string; password: string } {
  let at = 0;
  const whitespace = () => { while (/[ \t\r\n]/.test(text[at] ?? "!")) at++; };
  function string(): string {
    if (text[at] !== '"') return invalid();
    const start = at++;
    while (at < text.length) {
      const char = text[at++];
      if (char === "\\") { at++; continue; }
      if (char === '"') {
        try { const value: unknown = JSON.parse(text.slice(start, at)); if (typeof value === "string") return value; } catch { return invalid(); }
        return invalid();
      }
    }
    return invalid();
  }
  whitespace(); if (text[at++] !== "{") return invalid(); whitespace();
  const values = new Map<string, string>();
  for (let pair = 0; pair < 2; pair++) {
    const key = string();
    if (!["email", "password"].includes(key) || values.has(key)) return invalid();
    whitespace(); if (text[at++] !== ":") return invalid(); whitespace();
    values.set(key, string()); whitespace();
    if (text[at++] !== (pair === 0 ? "," : "}")) return invalid(); whitespace();
  }
  if (at !== text.length || !values.has("email") || !values.has("password")) return invalid();
  return { email: values.get("email")!, password: values.get("password")! };
}
async function readBody(request: Request, declared: number | undefined, schedule: IdentityRegistrationRequestHandlerInput["scheduleTimeout"]): Promise<string> {
  if (request.body === null) return invalid();
  const reader = request.body.getReader();
  let cancelTimer: (() => void) | undefined;
  let expired = false;
  const buffer = new Uint8Array(8192);
  let length = 0;
  const cancelReader = () => { try { void reader.cancel().catch(() => {}); } catch { /* cancellation cannot replace sanitized result */ } };
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      cancelTimer = schedule(() => { expired = true; cancelReader(); reject(new InputFailure("unavailable")); }, 5000);
      if (typeof cancelTimer !== "function") throw new InputFailure("unavailable");
    });
    const reading = (async () => {
      while (true) {
        const chunk = await reader.read();
        if (expired) throw new InputFailure("unavailable");
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array)) throw new InputFailure("unavailable");
        if (length + chunk.value.byteLength > 8192) { cancelReader(); throw new InputFailure("payload-too-large"); }
        buffer.set(chunk.value, length); length += chunk.value.byteLength;
      }
      if (length === 0 || (declared !== undefined && declared !== length)) return invalid();
      if (length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return invalid();
      try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)); } catch { return invalid(); }
    })();
    return await Promise.race([reading, deadline]);
  } catch (error) {
    cancelReader();
    throw error instanceof InputFailure ? error : new InputFailure("unavailable");
  } finally {
    cancelTimer?.();
    try { reader.releaseLock(); } catch { /* cancelled pending read may still be settling */ }
  }
}
export function createIdentityRegistrationRequestHandler(input: IdentityRegistrationRequestHandlerInput): IdentityRegistrationRequestHandler {
  let registration: IdentityRegistrationService;
  let expectedOrigin: string;
  let compromisedPasswords: RegistrationPasswordChecker;
  let abuseControl: RegistrationAbuseControl;
  let acquireWorkSlot: IdentityRegistrationRequestHandlerInput["acquireWorkSlot"];
  let scheduleTimeout: IdentityRegistrationRequestHandlerInput["scheduleTimeout"];
  try {
    if (!object(input)) throw new Error();
    ({ registration, expectedOrigin, compromisedPasswords, abuseControl, acquireWorkSlot, scheduleTimeout } = input);
    if (!object(registration) || typeof registration.register !== "function" || !origin(expectedOrigin) || !object(compromisedPasswords) || typeof compromisedPasswords.check !== "function" || !object(abuseControl) || typeof abuseControl.check !== "function" || typeof acquireWorkSlot !== "function" || typeof scheduleTimeout !== "function") throw new Error();
  } catch { return async () => failure("unavailable"); }
  return async request => {
    let release: (() => void) | undefined;
    let result: Response;
    try {
      if (request.method !== "POST") return failure("method-not-allowed");
      const incoming = request.headers.get("origin");
      if (!origin(incoming) || incoming !== expectedOrigin) return failure("origin-rejected");
      const type = request.headers.get("content-type");
      if (type === null || !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i.test(type)) return failure("unsupported-content-type");
      const encoded = request.headers.get("content-encoding");
      if (encoded !== null && encoded !== "identity") return failure("invalid-input");
      const rawLength = request.headers.get("content-length");
      let declared: number | undefined;
      if (rawLength !== null) {
        if (!/^(?:0|[1-9][0-9]*)$/.test(rawLength) || !Number.isSafeInteger(Number(rawLength))) return failure("invalid-input");
        declared = Number(rawLength); if (declared > 8192) return failure("payload-too-large");
      }
      const allowed = await abuseControl.check(request);
      if (allowed === "denied") return failure("rate-limited");
      if (allowed !== "allowed") return failure("unavailable");
      const slot = acquireWorkSlot();
      if (typeof slot !== "function") return failure("unavailable");
      release = slot;
      const payload = parseBody(await readBody(request, declared, scheduleTimeout));
      try { normalizeCredentialEmail(payload.email); } catch { throw new InputFailure("invalid-input"); }
      if (!isValidRegistrationPassword(payload.password)) throw new InputFailure("invalid-input");
      const checked = await compromisedPasswords.check(payload.password);
      if (checked === "rejected") throw new InputFailure("password-rejected");
      if (checked !== "allowed") throw new InputFailure("unavailable");
      const value: unknown = await registration.register(payload);
      if (keys(value, ["ok", "value"]) && value.ok === true && keys(value.value, ["principalId"])) {
        parsePrincipalId(value.value.principalId); result = acknowledgement();
      } else if (keys(value, ["ok", "error"]) && value.ok === false && keys(value.error, ["code", "message"]) && typeof value.error.message === "string") {
        result = value.error.code === "conflict" ? acknowledgement() : value.error.code === "invalid-input" ? failure("invalid-input") : failure("unavailable");
      } else result = failure("unavailable");
    } catch (error) { result = failure(error instanceof InputFailure ? error.code : "unavailable"); }
    finally {
      if (release) { try { release(); } catch { result = failure("unavailable"); } }
    }
    return result!;
  };
}

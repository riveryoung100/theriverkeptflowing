import type { RegistrationPasswordChecker } from "../http/principal-registration-api";
import { isValidRegistrationPassword } from "../authentication/registration-service";

export interface PwnedPasswordsCheckerInput {
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
  readonly subtle: Pick<SubtleCrypto, "digest">;
  readonly scheduleTimeout: (callback: () => void, milliseconds: number) => (() => void);
}

type Decision = Awaited<ReturnType<RegistrationPasswordChecker["check"]>>;
const maximumBytes = 1048576;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRange(text: string, expectedSuffix: string): Decision {
  if (text.endsWith("\r\n")) text = text.slice(0, -2);
  else if (text.endsWith("\n")) text = text.slice(0, -1);
  if (!text) return "unavailable";
  const lines = text.split(/\r?\n/);
  if (lines.length > 25000) return "unavailable";
  const seen = new Set<string>();
  let matched = false;
  for (const line of lines) {
    const match = /^([A-F0-9]{35}):([0-9]{1,20})$/.exec(line);
    if (!match || match[0] !== line || seen.has(match[1])) return "unavailable";
    seen.add(match[1]);
    if (match[1] === expectedSuffix && /[1-9]/.test(match[2])) matched = true;
  }
  return matched ? "rejected" : "allowed";
}

export function createPwnedPasswordsRegistrationChecker(input: PwnedPasswordsCheckerInput): RegistrationPasswordChecker {
  let fetchRange: PwnedPasswordsCheckerInput["fetch"];
  let digest: SubtleCrypto["digest"];
  let schedule: PwnedPasswordsCheckerInput["scheduleTimeout"];
  try {
    if (!record(input)) throw new Error();
    const { fetch, subtle, scheduleTimeout } = input;
    if (typeof fetch !== "function" || !record(subtle) || typeof subtle.digest !== "function" || typeof scheduleTimeout !== "function") throw new Error();
    fetchRange = fetch;
    digest = subtle.digest.bind(subtle);
    schedule = scheduleTimeout;
  } catch {
    return { async check() { return "unavailable"; } };
  }
  return {
    async check(password): Promise<Decision> {
      if (!isValidRegistrationPassword(password)) return "unavailable";
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let cancelTimer: (() => void) | undefined;
      let stopped = false;
      const abort = new AbortController();
      const stop = () => {
        stopped = true;
        abort.abort();
        try { void reader?.cancel().catch(() => {}); } catch { /* Best effort only. */ }
      };
      let result: Decision = "unavailable";
      try {
        let deadline!: (value: Decision) => void;
        const timeout = new Promise<Decision>((resolve) => { deadline = resolve; });
        cancelTimer = schedule(() => { stop(); deadline("unavailable"); }, 3000);
        if (typeof cancelTimer !== "function") throw new Error();
        const work = async (): Promise<Decision> => {
          if (stopped) return "unavailable";
          const hash = await digest("SHA-1", new TextEncoder().encode(password));
          if (stopped || !(hash instanceof ArrayBuffer) || hash.byteLength !== 20) return "unavailable";
          const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
          const response = await fetchRange("https://api.pwnedpasswords.com/range/" + hex.slice(0, 5), {
            method: "GET", headers: { "Add-Padding": "true" }, credentials: "omit",
            cache: "no-store", signal: abort.signal,
          });
          if (!(response instanceof Response)) return "unavailable";
          if (stopped || response.status !== 200 || !response.body || response.redirected) {
            try { void response.body?.cancel().catch(() => {}); } catch { /* Best effort only. */ }
            return "unavailable";
          }
          reader = response.body.getReader();
          const bytes = new Uint8Array(maximumBytes);
          let length = 0;
          while (!stopped) {
            const chunk = await reader.read();
            if (stopped) return "unavailable";
            if (chunk.done) break;
            if (!(chunk.value instanceof Uint8Array) || chunk.value.byteLength > maximumBytes - length) return "unavailable";
            bytes.set(chunk.value, length);
            length += chunk.value.byteLength;
          }
          if (stopped || (length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) return "unavailable";
          return parseRange(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)), hex.slice(5));
        };
        // Attach the failure handler immediately, including for work finishing after the deadline.
        result = await Promise.race([work().catch((): Decision => "unavailable"), timeout]);
      } catch {
        result = "unavailable";
      } finally {
        if (result === "unavailable") stop();
        try { cancelTimer?.(); } catch { result = "unavailable"; stop(); }
        try { reader?.releaseLock(); } catch { /* A pending cancelled read may still settle. */ }
      }
      return result;
    },
  };
}

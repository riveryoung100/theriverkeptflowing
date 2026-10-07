import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer } from "astro/container";

type Kind = "register" | "login";
const sources = Object.fromEntries((["register", "login"] as const).map(kind => [kind, readFileSync(new URL(`../../../pages/${kind}.astro`, import.meta.url), "utf8")])) as Record<Kind, string>;
const messages = {
  register: "Registration is temporarily unavailable.",
  login: "Authentication is temporarily unavailable.",
};
const successes = { register: "Registration request processed. Continue to sign in.", login: "You are signed in." };
function script(kind: Kind) {
  const matches = [...sources[kind].matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1); return matches[0][1];
}
function response(status: number, body: unknown) { return new Response(JSON.stringify(body), { status }); }
function success(kind: Kind) { return response(kind === "register" ? 202 : 200, kind === "register" ? { ok: true, message: successes.register } : { ok: true }); }
function fakePage(kind: Kind, fetchResponse: () => Promise<unknown> = async () => success(kind), missing?: string) {
  const events: string[] = []; const requests: { url: string; init: RequestInit }[] = [];
  class Element {
    textContent = ""; hidden = true; attrs: Record<string, string> = {};
    setAttribute(key: string, value: string) { this.attrs[key] = value; }
  }
  class Input extends Element { value = ""; }
  class Fields extends Element {
    #disabled = true;
    get disabled() { return this.#disabled; }
    set disabled(value: boolean) { events.push("fieldset:" + value); this.#disabled = value; }
  }
  class Button extends Fields {}
  class Form extends Element {
    valid = true; validations = 0;
    listener?: (event: { preventDefault(): void }) => Promise<void>;
    addEventListener(type: string, listener: Form["listener"]) { assert.equal(type, "submit"); events.push("handler"); this.listener = listener; }
    reportValidity() { this.validations++; return this.valid; }
  }
  const form = new Form(), email = new Input(), password = new Input(), fields = new Fields(), submit = new Button(), status = new Element(), uncertainty = new Element();
  const elements: Record<string, Element> = { "account-form": form, "account-email": email, "account-password": password, "account-fields": fields, "account-submit": submit, "account-status": status, "account-uncertainty": uncertainty };
  const forbidden = new Proxy({}, { get() { throw Error("forbidden browser side effect"); }, set() { throw Error("forbidden browser side effect"); } });
  new vm.Script(script(kind), { filename: kind + "-isolated-client.js" }).runInNewContext({
    document: { getElementById(id: string) { return id === missing ? null : elements[id]; } },
    HTMLElement: Element, HTMLFormElement: Form, HTMLInputElement: Input, HTMLFieldSetElement: Fields, HTMLButtonElement: Button,
    Uint8Array, TextDecoder, JSON, console: forbidden, localStorage: forbidden, sessionStorage: forbidden, location: forbidden,
    fetch: async (url: string, init: RequestInit) => {
      assert.equal(password.value, ""); assert.equal(form.attrs["aria-busy"], "true"); assert(fields.disabled && submit.disabled);
      requests.push({ url, init }); return fetchResponse();
    },
  });
  let prevented = 0;
  const send = async () => { assert(form.listener); await form.listener({ preventDefault() { prevented++; } }); };
  const fill = () => { email.value = " Synthetic@Example.test "; password.value = "Synthetic password only 🛶"; };
  return { form, email, password, fields, submit, status, uncertainty, requests, events, send, fill, get prevented() { return prevented; } };
}

for (const kind of ["register", "login"] as const) {
  test(kind + " standalone SSR credential source, exact fields and accessible semantics", () => {
    const source = sources[kind]; const markup = source.split("<style>")[0];
    assert.match(source, /export const prerender = false/);
    for (const sheet of ["tokens", "typography", "accessibility"]) assert(source.includes(`import "../styles/${sheet}.css";`));
    assert.match(source, /"Cache-Control", "no-store"/); assert.match(source, /"Referrer-Policy", "no-referrer"/); assert.match(source, /"X-Content-Type-Options", "nosniff"/);
    assert.match(markup, /name="robots" content="noindex,nofollow"/);
    assert.equal([...markup.matchAll(/<input\b/g)].length, 2);
    assert.match(markup, /for="account-email"/); assert.match(markup, /for="account-password"/);
    assert.match(markup, /id="account-email" type="email" autocomplete="email" required/);
    assert(markup.includes(`type="password" autocomplete="${kind === "register" ? "new-password" : "current-password"}"`));
    assert.match(markup, /aria-describedby="password-help" required/); assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(markup, /href="#account-main"/); assert.match(source, /:focus-visible/);
    assert(!/minlength|maxlength|confirm-password|visibility-toggle|type="checkbox"/.test(source));
  });
  test(kind + " native source fallback is disabled and credential inputs have no names", () => {
    const markup = sources[kind].split("<style>")[0];
    assert(markup.includes(`method="post" action="/api/identity/${kind}"`));
    assert.match(markup, /<fieldset id="account-fields" disabled>/); assert.match(markup, /<button id="account-submit" type="submit" disabled>/);
    for (const input of markup.matchAll(/<input\b[^>]*>/g)) assert(!/\bname=|\bvalue=|formaction=/.test(input[0]));
    assert.match(markup, /<noscript><p>JavaScript is required/);
    // Source structure is evidence only; this fake DOM does not prove native browser submission.
    const page = fakePage(kind); assert.deepEqual(page.events, ["handler", "fieldset:false", "fieldset:false"]); assert.equal(page.requests.length, 0);
  });
  test(kind + " exact JSON request, original values, password clearing and on-page fixed success", async () => {
    const page = fakePage(kind); page.fill(); await page.send();
    assert.equal(page.prevented, 1); assert.equal(page.requests.length, 1); const { url, init } = page.requests[0];
    assert.equal(url, `/api/identity/${kind}`); assert.equal(init.method, "POST"); assert.deepEqual(Object.fromEntries(new Headers(init.headers)), { "content-type": "application/json" });
    assert.equal(init.credentials, "same-origin"); assert.equal(init.redirect, "error"); assert.equal(init.cache, "no-store");
    assert.deepEqual(JSON.parse(init.body as string), { email: " Synthetic@Example.test ", password: "Synthetic password only 🛶" });
    assert.equal(page.password.value, ""); assert.equal(page.status.textContent, successes[kind]); assert.equal(page.form.attrs["aria-busy"], "false"); assert(!page.fields.disabled && !page.submit.disabled);
    assert(!page.status.textContent.includes(page.email.value));
  });
  test(kind + " pending duplicate submit is prevented, busy state restored, no retry", async () => {
    let finish!: (value: Response) => void; const held = new Promise<Response>(resolve => { finish = resolve; });
    const page = fakePage(kind, () => held); page.fill(); const first = page.send();
    assert.equal(page.requests.length, 1); assert(page.fields.disabled && page.submit.disabled); assert.equal(page.form.attrs["aria-busy"], "true");
    await page.send(); assert.equal(page.prevented, 2); assert.equal(page.form.validations, 1); assert.equal(page.requests.length, 1);
    finish(success(kind)); await first; assert(!page.fields.disabled && !page.submit.disabled); assert.equal(page.requests.length, 1);
  });
  test(kind + " native required/email reportValidity is only precheck", async () => {
    const page = fakePage(kind); page.fill(); page.form.valid = false; await page.send(); assert.equal(page.requests.length, 0); assert.equal(page.password.value, "Synthetic password only 🛶"); assert.equal(page.prevented, 1);
  });
  for (const id of ["account-form", "account-email", "account-password", "account-fields", "account-submit", "account-status", ...(kind === "register" ? ["account-uncertainty"] : [])]) test(kind + " failed DOM initialization remains inert: " + id, () => {
    const page = fakePage(kind, async () => success(kind), id); assert.equal(page.requests.length, 0); assert(page.fields.disabled && page.submit.disabled); assert.equal(page.form.listener, undefined);
  });
  test(kind + " network/redirect failure sanitized with zero retry", async () => {
    const page = fakePage(kind, async () => { throw Error("private network/redirect details"); }); page.fill(); await page.send();
    assert.equal(page.status.textContent, messages[kind]); assert.equal(page.password.value, ""); assert.equal(page.requests.length, 1); assert(!page.fields.disabled);
    if (kind === "register") assert.equal(page.uncertainty.hidden, false);
  });
  for (const [label, getResponse] of [
    ["HTML", () => new Response("<script>private-error</script>", { status: 503 })],
    ["malformed JSON", () => new Response("{")],
    ["null", () => response(200, null)], ["array", () => response(200, [])],
    ["wrong success status", () => response(201, { ok: true })],
    ["success includes internals", () => response(kind === "register" ? 202 : 200, { ok: true, message: successes[kind], principalId: "private" })],
    ["error text", () => response(503, { ok: false, error: { code: "unavailable", message: "private SQL exception" } })],
    ["unknown code", () => response(503, { ok: false, error: { code: "private", message: messages[kind] } })],
    ["nested extra details", () => response(503, { ok: false, error: { code: "unavailable", message: messages[kind], detail: "private" } })],
    ["root extra details", () => response(503, { ok: false, error: { code: "unavailable", message: messages[kind] }, detail: "private" })],
    ["string ok", () => response(200, { ok: "true" })],
    ["invalid UTF-8", () => new Response(new Uint8Array([0xc3, 0x28]))],
    ["BOM", () => new Response(new Uint8Array([239, 187, 191, 123, 125]))],
    ["missing body", () => new Response(null, { status: 503 })],
    ["stream error", () => new Response(new ReadableStream({ start(controller) { controller.error(Error("private stream")); } }))],
    ["redirected response", () => { const value = success(kind); Object.defineProperty(value, "redirected", { value: true }); return value; }],
  ] as const) test(kind + " sanitized unexpected response: " + label, async () => {
    const page = fakePage(kind, async () => getResponse()); page.fill(); await page.send(); assert.equal(page.status.textContent, messages[kind]); assert.equal(page.password.value, ""); assert.equal(page.requests.length, 1);
  });
  test(kind + " response accepts exact 4096 streamed bytes and cancels overflow", async () => {
    const body = kind === "register" ? JSON.stringify({ ok: true, message: successes.register }) : JSON.stringify({ ok: true });
    const bytes = new TextEncoder().encode(body + " ".repeat(4096 - body.length));
    const page = fakePage(kind, async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.subarray(0, 10)); controller.enqueue(bytes.subarray(10)); controller.close(); } }), { status: kind === "register" ? 202 : 200 })); page.fill(); await page.send(); assert.equal(page.status.textContent, successes[kind]);
    let cancelled = 0; const oversized = fakePage(kind, async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4097)); }, cancel() { cancelled++; } }), { status: 200 })); oversized.fill(); await oversized.send(); assert.equal(oversized.status.textContent, messages[kind]); assert.equal(cancelled, 1);
  });
  test(kind + " no storage, logs, redirects, analytics, authority or external security calls", () => {
    const source = sources[kind];
    assert(!/console\.|localStorage|sessionStorage|indexedDB|document\.cookie|location\.|window\.|MainLayout|ReadingLayout|Navbar|Footer|public\/script|gtag|googletag|analytics|https?:\/\/|cloudflare|Pwned|SHA-1|RIVER_|principalId|createSession|\.\.\/.*food|@gmail\.com/i.test(source));
    assert.equal([...source.matchAll(/fetch\(/g)].length, 1); assert.match(source, /payload = undefined;\s*body = undefined;/);
    assert(!/innerHTML|response\.json\(|response\.text\(/.test(source));
  });
  test(kind + " actual installed Astro compiler/container renders isolated HTML and security headers", async () => {
    const filename = new URL(`../../../pages/${kind}.astro`, import.meta.url).href;
    const compiled = transform(sources[kind], { filename, internalURL: "astro/compiler-runtime", resultScopedSlot: true, resolvePath: specifier => specifier });
    assert(!compiled.diagnostics.some(diagnostic => diagnostic.severity === "error")); assert.equal(compiled.scripts.length, 1); assert.equal(compiled.css.length, 1);
    // Container has no Vite CSS loader. Omit CSS imports only; normal build validates real styles/script bundling.
    const code = compiled.code.replace('"astro/compiler-runtime"', JSON.stringify(import.meta.resolve("astro/compiler-runtime"))).replace(/^import "[^"\n]+(?:\.css|lang\.css)";\n/gm, "");
    const module = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
    assert.equal(module.prerender, false);
    const container = await experimental_AstroContainer.create();
    const rendered = await container.renderToResponse(module.default, { request: new Request(`https://isolated.example.test/${kind}`) });
    assert.equal(rendered.status, 200); assert.equal(rendered.headers.get("cache-control"), "no-store"); assert.equal(rendered.headers.get("referrer-policy"), "no-referrer"); assert.equal(rendered.headers.get("x-content-type-options"), "nosniff");
    const html = await rendered.text();
    assert.match(html, /name="robots" content="noindex,nofollow"/); assert.match(html, /<fieldset[^>]*disabled/); assert.match(html, /<button[^>]*disabled/);
    for (const input of html.matchAll(/<input\b[^>]*>/g)) assert(!/\bname=|\bvalue=/.test(input[0]));
    assert(html.includes(`action="/api/identity/${kind}"`)); assert.match(html, /role="status"/); assert(!/https?:\/\/|analytics|gtag/.test(html));
  });
}

const registrationErrors = [
  [400, "invalid-input", "Registration input is invalid."], [400, "password-rejected", "Choose a different password."],
  [403, "origin-rejected", "Registration request was rejected."], [413, "payload-too-large", "Registration request is too large."],
  [415, "unsupported-content-type", "Registration requires JSON."], [429, "rate-limited", "Registration is temporarily limited. Try again later."],
  [503, "unavailable", messages.register],
] as const;
for (const [status, code, message] of registrationErrors) test("registration fixed feedback: " + code, async () => {
  const page = fakePage("register", async () => response(status, { ok: false, error: { code, message } })); page.fill(); await page.send(); assert.equal(page.status.textContent, message); assert.equal(page.uncertainty.hidden, status !== 503); assert.equal(page.password.value, "");
});
for (const [status, code, message] of [[401, "invalid-credentials", "Invalid email or password."], [403, "forbidden", "Login request was rejected."], [503, "unavailable", messages.login]] as const) test("login fixed feedback: " + code, async () => {
  const page = fakePage("login", async () => response(status, { ok: false, error: { code, message } })); page.fill(); await page.send(); assert.equal(page.status.textContent, message);
});
for (const message of ["Login requires a JSON object.", "Login accepts only email and password.", "Login email and password must be strings.", "Login requires a valid JSON body."]) test("login400 strips canonical validation detail: " + message, async () => {
  const page = fakePage("login", async () => response(400, { ok: false, error: { code: "invalid-input", message } })); page.fill(); await page.send(); assert.equal(page.status.textContent, "Login input is invalid.");
});
test("registration neutral result navigation; login stays on page with reciprocal/home links", () => {
  assert.match(sources.register, /href="\/login"/); assert.match(sources.login, /href="\/register"/); assert.match(sources.login, /href="\/"/);
  assert(!/account created|account already exists|redirect-query|window\.location|location\.href/i.test(sources.register + sources.login));
  assert.match(sources.register, /15 to 128 characters/); assert.match(sources.register, /Unicode characters/);
});
test("sitemap filter excludes only exact account variants and preserves Sesh/other behavior", () => {
  const source = readFileSync(new URL("../../../../astro.config.mjs", import.meta.url), "utf8");
  const config = vm.runInNewContext(source.replace(/^import .*;\r?\n/gm, "").replace("export default", "result ="), {
    URL, defineConfig: (value: unknown) => value, cloudflare: (options: unknown) => options, mdx: () => ({}), sitemap: (options: unknown) => options,
  }) as { site: string; output: string; adapter: unknown; integrations: { filter?: (page: string) => boolean }[] };
  assert.equal(config.site, "https://theriverkeptflowing.com"); assert.equal(config.output, "static"); assert.deepEqual(JSON.parse(JSON.stringify(config.adapter)), { imageService: "passthrough", prerenderEnvironment: "node" });
  const filter = config.integrations.find(integration => typeof integration.filter === "function")?.filter; assert(filter);
  for (const path of ["/register", "/register/", "/login", "/login/", "/sesh/studio/", "/sesh/studio/detail"]) assert.equal(filter(config.site + path), false);
  for (const path of ["/", "/register-guide", "/login/help", "/library", "/sesh"]) assert.equal(filter(config.site + path), true);
});

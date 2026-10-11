import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("actual isolated Worker Web Crypto verifies exact bootstrap bearer and rejects same-length incorrect bearer", async () => {
  const syntheticToken = "synthetic_worker_bootstrap_only_0123456789";
  const helperPath = fileURLToPath(new URL("./principal-owner-bootstrap-server.ts", import.meta.url));
  const bundle = await build({
    stdin: { contents: `import { verifyOwnerBootstrapBearer } from "./principal-owner-bootstrap-server.ts";
      export default { async fetch(request, env) {
        return Response.json({ accepted: await verifyOwnerBootstrapBearer(request.headers.get("authorization"), env.SYNTHETIC_BOOTSTRAP_TOKEN, crypto.subtle) });
      } };`, loader: "ts", resolveDir: dirname(helperPath) },
    bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", logLevel: "silent",
  });
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, compatibilityDate: "2026-07-24", cf: false,
    bindings: { SYNTHETIC_BOOTSTRAP_TOKEN: syntheticToken }, script: bundle.outputFiles[0].text,
  }));
  try {
    for (const [authorization, accepted] of [["Bearer " + syntheticToken, true], ["Bearer X" + syntheticToken.slice(1), false]] as const) {
      const response = await mf.dispatchFetch("https://isolated-bootstrap.example.test/", { headers: { authorization } });
      assert.equal(response.status, 200); assert.equal(response.headers.get("set-cookie"), null);
      const body = await response.text(); assert(!body.includes(syntheticToken)); assert(!body.includes(authorization));
      assert.deepEqual(JSON.parse(body), { accepted });
    }
  } finally { await mf.dispose(); }
});

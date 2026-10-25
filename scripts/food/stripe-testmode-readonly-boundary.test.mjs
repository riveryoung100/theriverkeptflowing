import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
test('readiness prints configuration booleans but never test key or customer details',()=>{
 // Synthetic redaction sentinel, never issued by Stripe; the child command is offline.
 const secret='sk_test_SYNTHETIC_OFFLINE_REDACTION_ONLY';
 const text=execFileSync(process.execPath,['scripts/food/stripe-testmode-readonly-readiness.mjs'],{encoding:'utf8',env:{...process.env,FOOD_STRIPE_TEST_READONLY_KEY:secret}});
 assert.doesNotMatch(text,/SYNTHETIC_OFFLINE_REDACTION_ONLY|sk_test_/);
 assert.match(text,/"testSecretKeyShapeValid": true/);
 assert.match(text,/"networkEnabled": false/);
});
test('no network-capable source, no public route imports private testmode contract',async()=>{
 for(const path of ['./stripe-testmode-readonly-contract.mjs','./stripe-testmode-readonly-readiness.mjs']) {
  const source=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(source,/\bfetch\s*\(|new\s+Stripe\s*\(|\.sessions\.retrieve\s*\(|\.paymentIntents\.retrieve\s*\(/);
 }
 for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']) {
  const source=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(source,/stripe-testmode-readonly-contract|stripe-testmode-readonly-readiness/);
 }
});

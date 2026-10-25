/** FOOD-014. Private executable entry point. Reads key via anonymous STDIN only.
 * Sends Stripe ONLY retrieve Session + retrieve PaymentIntent requests.
 */
import { createStripeTestReadClient, inspectExistingStripeTestSession, readOnlyFailureCode,
  validateStripeTestCredential, validateStripeTestSessionId } from './stripe-testmode-real-readonly-core.mjs';

const result = x => console.log(JSON.stringify(x));
try {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk.toString('utf8');
    if (input.length > 4096) throw new TypeError('Oversized private input');
  }
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).sort().join(',') !== 'secretKey,sessionId') {
    throw new TypeError('Unexpected input');
  }
  const key = validateStripeTestCredential(parsed.secretKey);
  const sessionId = validateStripeTestSessionId(parsed.sessionId);
  const stripe = createStripeTestReadClient(key, sessionId);
  const report = await inspectExistingStripeTestSession(sessionId, stripe);
  let audit=null;
  if(report.sessionRetrieved) {
    let db;
    try {
      const {LocalMiniflareD1}=await import('./local-miniflare-d1.ts');
      const {createLocalDualStatusAudit}=await import('./provider-dual-status-audit.ts');
      const {randomUUID}=await import('node:crypto');
      db=await LocalMiniflareD1.openPrivateAudit();
      const ledger=await createLocalDualStatusAudit(db);
      const saved=await ledger.observe(`observation_${randomUUID()}`,report,new Date().toISOString(),await ledger.revision());
      audit={storage:'LOCAL_TEST_DURABILITY',auditId:saved.auditId,revision:saved.revision,correlation:saved.correlation.kind};
    }catch {audit={storage:'FAILED_NOT_ACKNOWLEDGED',correlation:'UNCORRELATED_TEST_OBSERVATION'};process.exitCode=1;}
    finally {if(db)await db.close();}
  }
  result({...report,audit});
  if (report.classification.startsWith('INVALID_') || report.providerPairConsistent === false) process.exitCode = 1;
} catch (error) {
  // Never print the error, raw Stripe response, API key, or full provider identifiers.
  const classification = error instanceof SyntaxError || error instanceof TypeError ? 'INVALID_LOCAL_INPUT' : readOnlyFailureCode(error);
  result({provenance:'FOOD_COMMERCE_014', classification, reviewOnly:true, realStripeTestModeE2E:false,
    sessionRetrieved:false, paymentAuthorized:false, orderAuthorized:false, publicCheckoutEnabled:false, providerWritesRequested:false});
  process.exitCode = 1;
}

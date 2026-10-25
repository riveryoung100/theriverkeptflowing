import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const requirements = Object.freeze({
  display: ['accurateDescription', 'ingredientDisclosure', 'allergenDisclosure', 'photoDisclosure'],
  production: ['recipeApproved', 'portionsMeasured', 'packagingVerified', 'labelsVerified', 'foodHandlerVerified', 'regulatoryVerified', 'cookingCoolingVerified', 'freezingStorageVerified', 'transportVerified'],
  commercial: ['approvedPrice', 'orderLimits', 'fulfillmentOptions', 'productionDatesCapacity', 'taxReview', 'checkoutTested', 'paymentOrderReconciliation', 'confirmationsTested', 'refundCancellationPolicy']
});
const record = (v, keys) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) throw new Error('Invalid readiness record or unsupported field');
  return v;
};
const text = v => typeof v === 'string' && v.trim().length > 0 && v === v.trim();
function evidenceStatus(v) {
  if (v == null) return 'UNVERIFIED';
  record(v, ['status', 'evidenceReference']);
  if (![null, 'PASS', 'BLOCKED', 'UNVERIFIED'].includes(v.status)) throw new Error('Readiness status must be PASS, BLOCKED, UNVERIFIED or null');
  if (v.evidenceReference != null && !text(v.evidenceReference)) throw new Error('Invalid evidence reference');
  if (v.status === 'BLOCKED') return 'BLOCKED';
  return v.status === 'PASS' && text(v.evidenceReference) ? 'PASS' : 'UNVERIFIED';
}
const rollup = checks => checks.some(c => c.status === 'BLOCKED') ? 'BLOCKED' : checks.some(c => c.status === 'UNVERIFIED') ? 'UNVERIFIED' : 'PASS';
export function assessLaunchReadiness(input) {
  const r = record(input, ['schemaVersion', 'productId', 'productVersion', ...Object.keys(requirements), 'launchAuthorization']);
  if (r.schemaVersion !== 1 || typeof r.productId !== 'string' || !/^food-product:[a-z0-9-]+$/.test(r.productId) || !Number.isSafeInteger(r.productVersion) || r.productVersion < 1) throw new Error('Exact product identity/version required');
  const groups = Object.entries(requirements).map(([name, keys]) => {
    const group = r[name] == null ? {} : record(r[name], keys);
    const checks = keys.map(key => ({key, status: evidenceStatus(group[key]), evidenceReference: group[key]?.evidenceReference ?? null}));
    return {name, status: rollup(checks), checks};
  });
  let authorizationStatus = 'UNVERIFIED';
  const a = r.launchAuthorization;
  if (a != null) {
    record(a, ['status', 'evidenceReference', 'authorizedBy', 'authorizedOn', 'productId', 'productVersion']);
    const base = evidenceStatus({status: a.status, evidenceReference: a.evidenceReference});
    const realDate = typeof a.authorizedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.authorizedOn) && Number.isFinite(Date.parse(a.authorizedOn)) && new Date(a.authorizedOn).toISOString().slice(0, 10) === a.authorizedOn;
    authorizationStatus = base === 'BLOCKED' ? 'BLOCKED' : base === 'PASS' && text(a.authorizedBy) && realDate && a.productId === r.productId && a.productVersion === r.productVersion ? 'PASS' : 'UNVERIFIED';
  }
  return {productId: r.productId, productVersion: r.productVersion, groups, authorizationStatus,
    status: rollup([...groups, {status: authorizationStatus}]),
    notice: 'Evidence assertions only; references are not independently verified. PASS is not compliance certification, payment authority or a checkout switch. Separate explicit authorization and secure server enforcement remain required.'};
}
export function readinessReport(input) {
  const r = assessLaunchReadiness(input);
  return [`PRIVATE TABLE LAUNCH REVIEW: ${r.status}`, `${r.productId} v${r.productVersion}`,
    ...r.groups.flatMap(g => [`${g.name.toUpperCase()}: ${g.status}`, ...g.checks.map(c => `  ${c.key}: ${c.status} | evidence: ${c.evidenceReference ?? 'MISSING'}`)]),
    `EXPLICIT LAUNCH AUTHORIZATION: ${r.authorizationStatus}`, r.notice].join('\n');
}

/** Private sprint review. Local test evidence never satisfies a production gate. */
export function assessPrivateCommerceReadiness(input, localTestEvidence = {}) {
  const launch = assessLaunchReadiness(input);
  const localKeys = ['domainStateMachine','localD1Persistence','localD1Concurrency','holdExpiration','capacityReservation',
    'signedSyntheticWebhooks','providerExpiryLedger','exceptionReview','providerStatusContracts'];
  record(localTestEvidence, localKeys);
  const engineering = localKeys.map(key => ({key,scope:'LOCAL_SYNTHETIC',status:evidenceStatus(localTestEvidence[key]),
    evidenceReference:localTestEvidence[key]?.evidenceReference ?? null}));
  engineering.push(...['actualStripeTestRetrieval','testModeEndToEnd','productionD1Validation'].map(key=>({key,scope:'PROVIDER_OR_PRODUCTION',status:'UNVERIFIED',evidenceReference:null})),
    ...['productionCheckoutReadiness','ownerLaunchAuthorization'].map(key=>({key,scope:'PRODUCTION',status:'BLOCKED',evidenceReference:null})));
  const financeKeys=['receiptBasedIngredientCosts','actualPackagingCosts','deliveryExpenses','labor','processingFees',
    'verifiedSellingPrice','taxTreatment','targetOperatingMargin'];
  return Object.freeze({kind:'PRIVATE_PRELAUNCH_REVIEW',status:'BLOCKED',publicCheckoutEnabled:false,
    launch,engineering,finance:financeKeys.map(key=>({key,status:'UNVERIFIED',amount:null})),
    food:launch.groups.filter(g=>['display','production'].includes(g.name)),
    additionalFoodChecks:['nutritionEvidence','freezerReheatQuality','pickupDeliveryProcedures'].map(key=>({key,status:'UNVERIFIED'})),
    commercial:launch.groups.filter(g=>g.name==='commercial'),
    additionalCommercialChecks:['actualAvailableInventory','productionCapacity','customerCommunication','fulfillmentReadiness'].map(key=>({key,status:'UNVERIFIED'})),
    operatingProfitTargetMinor:20000,profitTargetIsPlanningOnly:true,
    notice:'Local test evidence assertions only. Missing costs remain unknown. No production payment or launch authority.'});
}
export async function main(args) {
  if(args[0]==='operations') {
    const {runReadinessEngineeringChecks,collectOperationalReadiness,operationalReadinessSummary}=await import('./private-readiness-evidence.mjs');
    const options={};let verify=false,json=false;
    for(let i=1;i<args.length;i++) {
      if(args[i]==='--verify-local')verify=true;
      else if(args[i]==='--json')json=true;
      else if(['--launch','--recipe','--cost','--business','--workbench'].includes(args[i])&&args[i+1])options[`${args[i++].slice(2)}File`]=args[i];
      else throw new TypeError('Usage: operations [--verify-local] [--json] [--launch file] [--recipe file] [--cost file] [--business file] [--workbench file]');
    }
    if(verify)options.engineeringReceipt=await runReadinessEngineeringChecks();
    const {LocalMiniflareD1}=await import('./local-miniflare-d1.ts');
    const {createLocalDualStatusAudit}=await import('./provider-dual-status-audit.ts');
    const db=await LocalMiniflareD1.openPrivateAudit();
    try {
      options.providerAudit=await createLocalDualStatusAudit(db);
      const report=await collectOperationalReadiness(options);
      console.log(json?JSON.stringify(report,null,2):operationalReadinessSummary(report));return 2;
    }finally{await db.close();}
  }
  const [command, file, ...rest] = args;
  if (!file || rest.length) throw new Error('Usage: node scripts/food/launch-readiness.mjs new <private.json> | check <private.json>');
  if (command === 'new') {
    await mkdir(dirname(resolve(file)), {recursive: true});
    await writeFile(file, await readFile(new URL('./launch-readiness.template.json', import.meta.url)), {flag: 'wx'});
    console.log(`Unverified launch record created: ${file}`);
  } else if (command === 'private-check') {
    const input = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    console.log(JSON.stringify(assessPrivateCommerceReadiness(input), null, 2));
    return 2; // Required production gates remain blocked, regardless of local assertions.
  } else if (command === 'check') {
    const input = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    console.log(readinessReport(input));
    return assessLaunchReadiness(input).status === 'PASS' ? 0 : 2;
  } else throw new Error('Unknown readiness command');
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Do not hold this module's evaluation open while the evidence adapter imports
  // the shared validator: that would deadlock the executable's dynamic import.
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;})
    .catch(error=>{console.error(`Readiness failed: ${error.message}`);process.exitCode=1;});
}

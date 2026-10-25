import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const scoreKeys = ['riceMoisture', 'riceTexture', 'potatoIntegrity', 'beanTexture', 'vegetableTexture', 'liquidControl', 'mushroomTexture', 'sauceTaste', 'sauceStability', 'crunch', 'sweetBalance', 'saltyBalance', 'savoryBalance', 'umamiBalance', 'bitterBalance', 'acidBalance', 'appearance', 'aroma', 'overallEnjoyment'];
export const safetyKeys = ['cooking', 'cooling', 'storageCapacity', 'portioning', 'coldStorage', 'transport', 'containerSuitability', 'thermometerCheck', 'sauceHandling', 'toppingHandling'];
const textKeys = ['recipeVersion', 'preparationDate', 'batchId', 'trialId', 'containerId', 'configuration', 'thawMethod', 'sauceStorage', 'toppingPackaging', 'measurementNotes', 'defects', 'recommendations'];
const numericFields = { storageDays: [0, 3650], portionGrams: [0.01, 10000], sauceGrams: [0, 1000], toppingGrams: [0, 1000], fillDepthMm: [0.01, 1000], startingTemperatureF: [-100, 300], microwaveWatts: [100, 3000], standingSeconds: [0, 86400], addedWaterGrams: [0, 1000], laborMinutes: [0, 10000] };
const knownKeys = [...textKeys, ...Object.keys(numericFields), 'storageCondition', 'standingCovered', 'stages', 'temperaturesF', 'scores', 'safety'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function exact(value, allowed, path) {
  if (!object(value)) throw new Error(`${path} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown field ${path}.${key}`);
}
function number(value, min, max, path, whole = false) {
  if (value == null) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (whole && !Number.isInteger(value))) throw new Error(`${path} must be ${whole ? 'a whole number' : 'a number'} from ${min} to ${max}, or null (untested).`);
}
function text(value, path) { if (value != null && (typeof value !== 'string' || !value.trim())) throw new Error(`${path} must be nonblank text or null.`); }
const missing = value => value == null;
export function validate(input) {
  exact(input, ['schemaVersion', 'trials'], 'input');
  if (input.schemaVersion !== 1 || !Array.isArray(input.trials)) throw new Error('Expected schemaVersion: 1 and trials array.');
  const ids = new Set();
  input.trials.forEach((t, index) => {
    const p = `trials[${index}]`;
    exact(t, knownKeys, p);
    for (const key of textKeys) text(t[key], `${p}.${key}`);
    if (t.preparationDate != null && (!/^\d{4}-\d{2}-\d{2}$/.test(t.preparationDate) || !Number.isFinite(Date.parse(t.preparationDate)) || new Date(t.preparationDate).toISOString().slice(0, 10) !== t.preparationDate)) throw new Error(`${p}.preparationDate must be a real YYYY-MM-DD date.`);
    if (t.trialId != null) { if (ids.has(t.trialId)) throw new Error(`Duplicate trialId: ${t.trialId}`); ids.add(t.trialId); }
    if (t.storageCondition != null && !['fresh', 'refrigerated', 'frozen'].includes(t.storageCondition)) throw new Error(`${p}.storageCondition must be fresh, refrigerated, frozen or null.`);
    for (const [key, [min, max]] of Object.entries(numericFields)) number(t[key], min, max, `${p}.${key}`, key === 'microwaveWatts');
    if (t.standingCovered != null && typeof t.standingCovered !== 'boolean') throw new Error(`${p}.standingCovered must be boolean or null.`);
    if (t.storageCondition === 'fresh' && t.storageDays != null && t.storageDays !== 0) throw new Error(`${p}: fresh control must have zero storageDays.`);
    if (t.stages != null) {
      if (!Array.isArray(t.stages)) throw new Error(`${p}.stages must be an array.`);
      t.stages.forEach((stage, i) => {
        exact(stage, ['seconds', 'powerPercent', 'covered', 'action'], `${p}.stages[${i}]`);
        number(stage.seconds, 0.01, 86400, `${p}.stage.seconds`);
        number(stage.powerPercent, 1, 100, `${p}.stage.powerPercent`);
        if (stage.covered != null && typeof stage.covered !== 'boolean') throw new Error('stage.covered must be boolean or null.');
        text(stage.action, 'stage.action');
      });
    }
    if (t.temperaturesF != null) {
      exact(t.temperaturesF, ['center', 'edge', 'bottom'], `${p}.temperaturesF`);
      for (const [key, value] of Object.entries(t.temperaturesF)) number(value, -100, 300, `${p}.temperaturesF.${key}`);
    }
    if (t.scores != null) {
      exact(t.scores, scoreKeys, `${p}.scores`);
      for (const [key, value] of Object.entries(t.scores)) number(value, 1, 5, `${p}.scores.${key}`, true);
    }
    if (t.safety != null) {
      exact(t.safety, safetyKeys, `${p}.safety`);
      for (const [key, value] of Object.entries(t.safety)) {
        if (value == null) continue;
        exact(value, ['status', 'evidence'], `${p}.safety.${key}`);
        if (value.status != null && !['pass', 'fail'].includes(value.status)) throw new Error('Safety status must be pass, fail or null.');
        text(value.evidence, `${p}.safety.${key}.evidence`);
      }
    }
  });
  return input;
}

export function analyze(input) {
  validate(input);
  return input.trials.map((t, index) => {
    const gaps = [], failures = [], textureFailures = [], recommendations = [];
    const need = (key, value) => { if (missing(value)) gaps.push(key); };
    for (const key of ['recipeVersion', 'preparationDate', 'batchId', 'trialId', 'containerId', 'configuration', 'storageCondition', 'storageDays', 'portionGrams', 'sauceGrams', 'toppingGrams', 'fillDepthMm', 'sauceStorage', 'toppingPackaging', 'measurementNotes', 'laborMinutes']) need(key, t[key]);
    for (const key of safetyKeys) {
      const check = t.safety?.[key];
      if (check?.status === 'fail') failures.push(`safety.${key}: recorded failure`);
      if (!check?.status || !check?.evidence) gaps.push(`safety.${key}: status and evidence required`);
    }
    const reheated = ['refrigerated', 'frozen'].includes(t.storageCondition);
    if (t.storageCondition === 'frozen') need('thawMethod (including direct-from-frozen)', t.thawMethod);
    if (reheated) {
      for (const key of ['microwaveWatts', 'startingTemperatureF', 'standingSeconds', 'standingCovered', 'addedWaterGrams']) need(key, t[key]);
      if (t.standingCovered === false) failures.push('standing period was not covered');
      if (!t.stages?.length) gaps.push('actual reheating stages');
      else t.stages.forEach((s, i) => { for (const k of ['seconds', 'powerPercent', 'covered', 'action']) need(`stages[${i}].${k}`, s[k]); });
      for (const point of ['center', 'edge', 'bottom']) {
        const value = t.temperaturesF?.[point];
        need(`post-standing temperature: ${point}`, value);
        if (value != null && value < 165) failures.push(`${point}: ${value} F below 165 F reheat target`);
      }
      if (t.standingSeconds != null && t.standingSeconds < 120) failures.push('standing time below 120-second research minimum');
    } else if (t.storageCondition == null) gaps.push('reheat verification cannot be assessed without storage condition');
    for (const key of scoreKeys) {
      need(`score.${key}`, t.scores?.[key]);
      if (['riceMoisture', 'riceTexture', 'potatoIntegrity', 'beanTexture', 'vegetableTexture', 'liquidControl', 'mushroomTexture', 'sauceStability', 'crunch'].includes(key) && t.scores?.[key] != null && t.scores[key] <= 2) textureFailures.push(`${key}: ${t.scores[key]}/5`);
    }
    if (failures.length) recommendations.push('HOLD sensory tasting; investigate failed handling/temperature checks. Do not use reheating to rescue unsafe food.');
    const safetyGaps = gaps.filter(g => !g.startsWith('score.') && g !== 'laborMinutes');
    if (safetyGaps.length) recommendations.push('Complete handling evidence, trial context and applicable multipoint temperature verification before any tasting.');
    if (textureFailures.length) recommendations.push('Retest flagged textures, changing one variable against a matched control.');
    if (gaps.length) recommendations.push('Record missing observations; do not replace untested values with assumptions.');
    if (!failures.length && !gaps.length) recommendations.push('Repeat matched trials across storage checkpoints and wattages; obtain separate qualified safety/regulatory review.');
    return { trial: t, label: t.trialId ?? `Unidentified trial ${index + 1}`, gaps, failures, textureFailures, recommendations,
      safetyStatus: failures.length ? 'HOLD — recorded failure' : safetyGaps.length ? 'UNVERIFIED — evidence gaps' : 'Recorded checks complete — independent review still required' };
  });
}
const show = value => value == null ? 'UNTESTED' : String(value);
export function report(input) {
  const results = analyze(input);
  const lines = ['PRIVATE RECIPE LAB — experimental observations only', 'No commercial approval, validated shelf life, customer reheating instructions or winner is generated.', 'Safety is separate from sensory quality. Missing values remain UNTESTED. Recorded checks are not a safety certification.', ''];
  if (!results.length) lines.push('No trials recorded. Start a blank trial; no results available.');
  for (const r of results) {
    const t = r.trial;
    lines.push(`TRIAL ${r.label}`, `Recipe ${show(t.recipeVersion)} | batch ${show(t.batchId)} | prepared ${show(t.preparationDate)}`, `Storage ${show(t.storageCondition)} | days ${show(t.storageDays)} | thaw ${show(t.thawMethod)}`, `Base ${show(t.portionGrams)} g | sauce ${show(t.sauceGrams)} g (${show(t.sauceStorage)}) | topping ${show(t.toppingGrams)} g (${show(t.toppingPackaging)})`, `Container ${show(t.containerId)} | depth ${show(t.fillDepthMm)} mm | configuration ${show(t.configuration)}`, `Microwave ${show(t.microwaveWatts)} W | start ${show(t.startingTemperatureF)} F | added water ${show(t.addedWaterGrams)} g | stand ${show(t.standingSeconds)} s`, `Actual stages: ${t.stages?.length ? JSON.stringify(t.stages) : 'UNTESTED'}`, `Post-standing F: center ${show(t.temperaturesF?.center)}, edge ${show(t.temperaturesF?.edge)}, bottom ${show(t.temperaturesF?.bottom)}`, `SAFETY: ${r.safetyStatus}`);
    lines.push(`Standing covered: ${show(t.standingCovered)}`);
    for (const key of safetyKeys) lines.push(`  ${key}: ${show(t.safety?.[key]?.status)}; evidence: ${show(t.safety?.[key]?.evidence)}`);
    lines.push(`Scores (1=unacceptable, 2=poor, 3=acceptable prototype, 4=good, 5=excellent; balance means appropriateness, not intensity):`, ...scoreKeys.map(k => `  ${k}: ${show(t.scores?.[k])}`), `TEXTURE FLAGS: ${r.textureFailures.join('; ') || 'None observed in entered scores; missing scores are not passes.'}`, `FAILURES: ${r.failures.join('; ') || 'None recorded; not proof of safety.'}`, `MISSING: ${r.gaps.join('; ') || 'None in tracked fields.'}`, `Labor minutes: ${show(t.laborMinutes)}`, `Measurement notes: ${show(t.measurementNotes)}`, `Defects: ${show(t.defects)}`, `Owner recommendations: ${show(t.recommendations)}`, ...r.recommendations.map(s => `NEXT: ${s}`), '');
  }
  // Descriptive summaries retain storage/wattage/checkpoint distinctions; no ranking.
  const groups = new Map();
  for (const { trial: t } of results) {
    const group = [t.recipeVersion, t.storageCondition, t.storageDays, t.microwaveWatts].map(show).join(' | ');
    const values = groups.get(group) ?? [];
    values.push(t); groups.set(group, values);
  }
  lines.push('COMPARISON: recipe | storage | days | watts; observational only, not matched unless conditions agree.');
  for (const [group, trials] of groups) {
    const observed = trials.map(t => t.scores?.overallEnjoyment).filter(v => v != null);
    lines.push(`${group}: ${trials.length} trial(s); enjoyment observations ${observed.length}/${trials.length}; mean ${observed.length ? (observed.reduce((a, b) => a + b, 0) / observed.length).toFixed(2) : 'UNTESTED'}`);
  }
  for (const version of [...new Set(results.map(r => r.trial.recipeVersion).filter(v => v != null))]) {
    const trials = results.map(r => r.trial).filter(t => t.recipeVersion === version);
    const coverageGaps = [];
    if (!trials.some(t => t.storageCondition === 'fresh')) coverageGaps.push('fresh control');
    for (const watts of [700, 1100]) {
      if (!trials.some(t => t.storageCondition === 'refrigerated' && t.microwaveWatts === watts)) coverageGaps.push(`refrigerated ${watts} W`);
      for (const day of [0, 7, 14, 30]) if (!trials.some(t => t.storageCondition === 'frozen' && t.storageDays === day && t.microwaveWatts === watts)) coverageGaps.push(`frozen day ${day} ${watts} W`);
    }
    lines.push(`UNRECORDED CONDITIONS ${version}: ${coverageGaps.join('; ') || 'None in planned matrix; repeatability and safety still require review.'}`);
  }
  lines.push('NEXT COVERAGE: repeat each variant with fresh control, refrigerated control, initial frozen and 7/14/30-day frozen quality checkpoints at both 700/1100 W. These are research checkpoints, not shelf-life claims.');
  return lines.join('\n');
}

export async function main(args) {
  const [command, file, ...rest] = args;
  if (command === 'new' && file && !rest.length) {
    const template = await readFile(new URL('./recipe-lab.template.json', import.meta.url), 'utf8');
    await mkdir(dirname(resolve(file)), { recursive: true });
    await writeFile(file, template, { flag: 'wx' }); // Never overwrite recorded work.
    console.log(`Blank UNTESTED trial created: ${file}`);
  } else if (command === 'compare' && file) {
    const combined = { schemaVersion: 1, trials: [] };
    for (const path of [file, ...rest]) {
      const input = JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
      validate(input);
      combined.trials.push(...input.trials);
    }
    console.log(report(combined));
  } else throw new Error('Usage: node scripts/food/recipe-lab.mjs new <private.json> | compare <private.json> [more-private.json ...]');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(`Recipe lab failed: ${error.message}`); process.exitCode = 1; }
}

/** Founder planning taxonomy. This creates no products, SKUs, offers or availability. */
export const TABLE_MENU_DEPARTMENTS = Object.freeze([
 {id:'hot-food-bowls',label:'Hot Food Bowls',stage:'ACTIVE_EXPERIMENT',concepts:['Southwest Harvest Bowl','East Asian-inspired vegetable stir-fry bowl']},
 {id:'cold-bowls',label:'Cold Bowls / Açaí / Playa-inspired',stage:'FUTURE_CONCEPT',concepts:['Açaí bowls','Ube, mango, coconut and cacao variations']},
 {id:'hot-soups',label:'Hot Soups',stage:'FUTURE_CONCEPT',concepts:['Mi-Mi-inspired Chickenless Gnocchi Soup featuring The Table’s Signature Gnocchi']},
 {id:'signature-gnocchi',label:'Signature Gnocchi',stage:'FUTURE_CONCEPT',concepts:['Garden Vegetable Gnocchi','Seasonally sauced signature gnocchi dishes']},
 {id:'juice-water',label:'Juice / Water',stage:'FUTURE_CONCEPT',concepts:['Measured pressed juices','Distinct juice/water blends']},
 {id:'freezer-packs',label:'Take-Home Frozen Gnocchi Packs',stage:'FUTURE_CONCEPT',concepts:['Bulk frozen signature gnocchi']}
].map(department=>Object.freeze({...department,concepts:Object.freeze(department.concepts)})));

/** Only this existing concept belongs in the current public conversion path. */
export const TABLE_FIRST_DEPARTMENT = TABLE_MENU_DEPARTMENTS[0];
export const TABLE_FIRST_PRODUCT_SLUG = 'southwest-harvest-bowl';
export function currentTableDepartment(slug:string){return slug===TABLE_FIRST_PRODUCT_SLUG?TABLE_FIRST_DEPARTMENT:null;}

/** Presentation of founder intent; canonical recipe history is deliberately unchanged. */
export const SOUTHWEST_PRELAUNCH_DESIGN = Object.freeze({
 description:'Our first frozen bowl concept brings together roasted sweet potatoes, black beans, rice, peppers and onions. Cilantro-lime sauce is planned inside the bowl, with a sealed dry pepita packet to remove before reheating and sprinkle afterward. The recipe and complete meal are still being tested.',
 ingredients:Object.freeze(['Roasted sweet potatoes','Black beans','Rice','Roasted peppers and onions','Cilantro-lime sauce — inside the bowl','Pepitas — separate dry packet']),
 finishingComponents:Object.freeze([
  Object.freeze({name:'Cilantro-lime sauce',description:'Planned above the rice and beneath the vegetables, to freeze and reheat with the bowl. The complete recipe and heating method remain unvalidated.'}),
  Object.freeze({name:'Dry pepita packet',description:'One separately sealed dry packet, removed before microwave heating. Packaging, seal and attachment suitability still need verification.'})
 ]),
 pending:'Feta is excluded from the initial concept. Mushrooms are excluded from current experiments; that preference is not a final approved recipe decision. Kale in the sauce is under evaluation, not confirmed. Final ingredients, seasonings and supplier subingredients are not yet verified.'
});

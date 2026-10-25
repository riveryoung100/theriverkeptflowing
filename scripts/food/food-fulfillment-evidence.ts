/** Private assessment of an existing SYNTHETIC order's final handoff event; no new fulfillment authority. */
import type {SimulationOrder} from '../../src/lib/food/table-order-engine';
import type {TableWindow} from '../../src/lib/food/table-scheduling';
import {instant,modelRef,validateWindow,freezeModel} from '../../src/lib/food/table-scheduling';
import {strictObject} from '../../src/lib/food/table-catalog';
export interface SyntheticHandoffEvidence {
 orderId:string;windowId:string;method:'pickup'|'delivery';at:string;evidenceReference:string;
}
export function assessSyntheticHandoff(order:SimulationOrder,window:TableWindow,input:unknown) {
 const record=strictObject(input,['orderId','windowId','method','at','evidenceReference']);
 const time=instant(record.at as string);modelRef(record.orderId);modelRef(record.windowId);modelRef(record.evidenceReference);
 const w=validateWindow(window);
 if(record.method!=='pickup'&&record.method!=='delivery')throw new TypeError('Explicit handoff method required');
 if(!order||order.mode!=='simulation-only'||order.realPaymentVerified!==false)throw new TypeError('Synthetic order required; real order cannot enter fixture assessor');
 if(record.orderId!==order.id||record.windowId!==order.windowId||record.windowId!==w.id)throw new TypeError('Order and fulfillment window identity mismatch');
 if(record.method==='pickup'&&w.method!=='meetup'||record.method==='delivery'&&w.method!=='personal-delivery')throw new TypeError('Handoff method mismatch');
 const final=order.events.at(-1);
 if(order.status!=='fulfilled'||!order.quote||!order.paymentEventId||!final||final.status!=='fulfilled')throw new TypeError('Completed synthetic paid order evidence required');
 if(final.at!==record.at||final.evidenceReference!==record.evidenceReference)throw new TypeError('Evidence must match existing fulfillment event exactly');
 if(time<instant(w.startsAt)||time>instant(w.endsAt))throw new TypeError('Handoff lies outside verified window');
 if(!w.verified||!w.evidenceReference)throw new TypeError('Verified synthetic handoff window required');
 return freezeModel({kind:'EXISTING_SYNTHETIC_HANDOFF_CROSSCHECK',orderId:order.id,orderVersion:order.version,
  quoteId:order.quote.id,windowId:w.id,evidenceReference:record.evidenceReference,
  at:record.at,matchedExistingSyntheticEvent:true,physicalHandoffIndependentlyVerified:false,
  realCustomerFulfillment:false,livePaymentProved:false,publicCheckoutEnabled:false});
}

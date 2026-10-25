/** Private local audit inspection, no provider transport invocation. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
const db=await LocalMiniflareD1.openPrivateAudit();
try {
 const audit=await createLocalDualStatusAudit(db);
 console.log(JSON.stringify({scope:'LOCAL_TEST_DURABILITY',revision:await audit.revision(),
  observations:await audit.observations(),paymentAuthorized:false,orderAuthorized:false},null,2));
} finally {await db.close();}

/** Private bounded diagnostics. Never accepts raw errors, signatures, keys or contacts. */
import { modelFingerprint } from './table-capacity-model';
import { freezeModel } from './table-scheduling';
export type TableDiagnosticCode = 'committed' | 'duplicate-request' | 'capacity-exhausted' | 'version-conflict' | 'idempotency-conflict' | 'storage-failure' | 'transition-rejected' | 'payment-evidence-rejected';
export interface TableDiagnosticRecord {
  readonly provenance: 'SYNTHETIC'; readonly environment: 'LOCAL_TEST'; readonly sequence: number;
  readonly code: TableDiagnosticCode; readonly operationHash: string;
  readonly boundary: string;
}
export function createTableLocalDiagnostics() {
  const records: TableDiagnosticRecord[] = []; let sequence = 0;
  return Object.freeze({record(code: TableDiagnosticCode, opaqueOperation: string) {
    if (!['committed','duplicate-request','capacity-exhausted','version-conflict','idempotency-conflict','storage-failure','transition-rejected','payment-evidence-rejected'].includes(code)) throw new TypeError('Unsupported diagnostic code');
    const prefix = opaqueOperation.split('/')[0];
    const boundary = ['create','order','checkout','provider','cleanup','authority','recovery','webhook'].includes(prefix) ? prefix : 'unknown';
    records.push(freezeModel({provenance: 'SYNTHETIC', environment: 'LOCAL_TEST', sequence: ++sequence, code, boundary, operationHash: modelFingerprint(opaqueOperation)}));
    if (records.length > 200) records.shift();
  }, snapshot: () => freezeModel([...records])});
}
export type TableLocalDiagnostics = ReturnType<typeof createTableLocalDiagnostics>;

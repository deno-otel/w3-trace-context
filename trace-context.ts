import { w3TraceState } from "./deps.ts";
import { TraceFlags } from "./trace-flags.ts";

export interface TraceContext {
  traceId: Uint8Array;
  parentId: Uint8Array;
  traceFlags: TraceFlags;
  traceState: w3TraceState.TraceState;
}

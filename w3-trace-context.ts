import { TraceParentData, parseTraceParent } from "./parse-trace-parent.ts";
import { w3TraceState } from "./deps.ts";
import { TraceState } from "../w3-trace-state/trace_state.ts";
import { InvalidError } from "./exceptions/invalid-error.ts";
import { UnparseableError } from "./exceptions/unparseable-error.ts";

const TRACE_PARENT_HEADER_REGEX = /traceparent/i;
const TRACE_STATE_HEADER_REGEX = /tracestate/i;

export class W3TraceContext {
  private traceParentString: string = "";
  private traceStateString: string = "";
  private traceParentData: TraceParentData | null = null;
  private traceStateData: TraceState | null = null;

  static fromHeaders(headers: Headers) {
    const context = new W3TraceContext();
    for (const [key, value] of headers.entries()) {
      if (TRACE_PARENT_HEADER_REGEX.test(key)) {
        context.traceParentString = value;
      }
      if (TRACE_STATE_HEADER_REGEX.test(key)) {
        context.traceStateString = value;
      }
    }

    return context;
  }

  private getTraceState() {
    if (this.traceStateData === null) {
      this.traceStateData = w3TraceState.getTraceStateFromHeader(
        this.traceStateString
      );
    }
    return this.traceStateData;
  }

  private getParentData(): TraceParentData {
    if (this.traceParentData === null) {
      try {
        this.traceParentData = parseTraceParent(this.traceParentString);
      } catch (e) {
        if (e instanceof UnparseableError || e instanceof InvalidError) {
          this.clearTraceParent();
        }
      }
    }

    return this.traceParentData!;
  }

  private clearTraceParent() {
    this.traceParentString = "";
    this.traceParentData = {
      version: 0,
      traceId: new Uint8Array(16),
      parentId: new Uint8Array(8),
      sampled: false,
      extraFields: [],
    };
  }

  get version() {
    const parentData = this.getParentData();
    return parentData.version;
  }

  get traceId() {
    const parentData = this.getParentData();
    return parentData.traceId;
  }

  get parentId() {
    const parentData = this.getParentData();
    return parentData.parentId;
  }

  get sampled() {
    const parentData = this.getParentData();
    return parentData.sampled;
  }

  get traceState() {
    return this.getTraceState();
  }
}

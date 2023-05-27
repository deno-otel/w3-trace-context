import { TraceParentData, parseTraceParent } from "./parse-trace-parent.ts";
import { w3TraceState } from "./deps.ts";
import { InvalidError } from "./exceptions/invalid-error.ts";
import { UnparseableError } from "./exceptions/unparseable-error.ts";
import { bufferToHexstring } from "./buffer-to-hexstring.ts";

const TRACE_PARENT_HEADER_REGEX = /traceparent/i;
const TRACE_STATE_HEADER_REGEX = /tracestate/i;

/**
 * This class represents the W3C Trace Context as defined at https://www.w3.org/TR/trace-context/
 */
export class W3TraceContext {
  private traceParentString: string = "";
  private traceStateString: string = "";
  private traceParentData: TraceParentData | null = null;
  private traceStateData: w3TraceState.TraceState | null = null;

  /**
   * Generates a W3TraceContext instance from HTTP headers.
   *
   * This expects there to be a `traceparent` and a `tracestate` header, per the spec.
   *
   * This method won't actually validate the headers, but will extract and save them
   */
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

  toHeaders(headers: Headers = new Headers()) {
    if (this.traceStateString !== "") {
      const traceState = this.getTraceState();
      if (traceState.length > 0) {
        headers.set(
          "tracestate",
          w3TraceState.getHeaderFromTraceState(this.traceState)
        );
      }
    }
    if (this.traceParentString !== "") {
      const traceIdString = bufferToHexstring(this.traceId);
      const parentIdString = bufferToHexstring(this.parentId);
      const versionString = this.version.toString(16).padStart(2, "0");
      const sampledString = this.sampled ? "01" : "00";
      headers.set(
        "traceparent",
        `${versionString}-${traceIdString}-${parentIdString}-${sampledString}`
      );
    }
    return headers;
  }

  private getTraceState() {
    if (this.traceStateString === "") {
      this.traceStateData = w3TraceState.getEmptyTraceState();
    }
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
          console.warn(
            `W3TraceContext had invalid traceparent: '${this.traceParentString}'`
          );
        } else {
          console.warn(
            "W3TraceContext hit unexpected error processing traceparent",
            e
          );
        }
        this.clearTraceParent();
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

  /**
   * Returns the version of the traceparent header.
   */
  get version() {
    const parentData = this.getParentData();
    return parentData.version;
  }

  /**
   * Returns the traceId from the traceparent header.
   */
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

  get extraFields() {
    const parentData = this.getParentData();
    return parentData.extraFields;
  }

  getTraceStateValue(key: string): string | undefined {
    return w3TraceState.getTraceStateValue(this.getTraceState(), key);
  }

  addTraceStateValue(key: string, value: string): void {
    this.traceStateData = w3TraceState.addTraceStateValue(
      this.getTraceState(),
      key,
      value
    );
  }

  updateTraceStateValue(key: string, value: string): void {
    this.traceStateData = w3TraceState.updateTraceStateValue(
      this.getTraceState(),
      key,
      value
    );
  }

  deleteTraceStateValue(key: string): void {
    this.traceStateData = w3TraceState.deleteTraceStateValue(
      this.getTraceState(),
      key
    );
  }
}

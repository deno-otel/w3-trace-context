import {
  isValidId,
  parseTraceParent,
  TraceParentData,
} from "./parse-trace-parent.ts";
import { w3TraceState } from "./deps.ts";
import { InvalidError } from "./exceptions/invalid-error.ts";
import { UnparseableError } from "./exceptions/unparseable-error.ts";
import { bufferToHexstring } from "./buffer-to-hexstring.ts";
import { type IdGenerator } from "./deps.ts";
import { TraceContext } from "./trace-context.ts";
import { TraceFlags } from "./trace-flags.ts";

const TRACE_PARENT_HEADER_REGEX = /traceparent/i;
const TRACE_STATE_HEADER_REGEX = /tracestate/i;

interface FromScratchParentOptions {
  generator: IdGenerator;
  sampled?: boolean;
}

/**
 * This class represents the W3C Trace Context as defined at https://www.w3.org/TR/trace-context/
 */
export class W3TraceContext implements TraceContext {
  private traceParentString = "";
  private traceStateString = "";
  private traceParentData: TraceParentData | null = null;
  private traceStateData: w3TraceState.TraceState | null = null;

  private constructor() {}

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

  /**
   * Generates a W3TraceContext instance from scratch
   *
   * This requires an implementation of the {@link IdGenerator} interface to generate the trace and span IDs
   * There is an optional `sampled` parameter that defaults to `false`
   *
   * If you want to add a TraceState, you can pass it in as the second parameter
   */
  static fromScratch(
    { generator, sampled = false }: FromScratchParentOptions,
    state?: w3TraceState.TraceState
  ) {
    const context = new W3TraceContext();
    const traceId = generator.generateTraceIdBytes();
    const parentId = generator.generateSpanIdBytes();
    const version = 0;
    context.traceParentData = {
      traceId,
      parentId,
      version,
      sampled,
      extraFields: [],
    };
    if (state !== undefined) {
      context.traceStateData = state;
    }

    return context;
  }

  /**
   * Generates a W3TraceContext instance from Trace Parent data and, if provided, Trace State data
   */
  static fromTraceData(
    traceParent: TraceParentData,
    traceState: w3TraceState.TraceState = w3TraceState.getEmptyTraceState()
  ) {
    const context = new W3TraceContext();
    if (!isValidId(traceParent.traceId)) {
      throw new InvalidError("Invalid trace ID");
    }
    if (!isValidId(traceParent.parentId)) {
      throw new InvalidError("Invalid parent ID");
    }
    context.traceParentData = traceParent;
    context.traceStateData = traceState;

    return context;
  }

  private generateTraceStateString() {
    const traceState = this.getTraceState();
    if (traceState.length > 0) {
      return w3TraceState.getHeaderFromTraceState(this.traceState);
    }
    return null;
  }

  private generateTraceParentString() {
    if (isValidId(this.traceId) && isValidId(this.parentId)) {
      const traceIdString = bufferToHexstring(this.traceId);
      const parentIdString = bufferToHexstring(this.parentId);
      const versionString = this.version.toString(16).padStart(2, "0");
      const sampledString = this.sampled ? "01" : "00";
      return `${versionString}-${traceIdString}-${parentIdString}-${sampledString}`;
    }
    return null;
  }

  /**
   * Creates or updates a Headers object with `traceparent` and `tracestate` headers (if they exist)
   */
  toHeaders(headers: Headers = new Headers()) {
    const traceStateString = this.generateTraceStateString();
    const traceParentString = this.generateTraceParentString();
    if (traceStateString !== null) {
      headers.set("tracestate", traceStateString);
    }
    if (traceParentString !== null) {
      headers.set("traceparent", traceParentString);
    }

    return headers;
  }

  private getTraceState() {
    if (this.traceStateData === null) {
      if (this.traceStateString === "") {
        this.traceStateData = w3TraceState.getEmptyTraceState();
      }
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

  /**
   * Returns the parentId from the traceparent header.
   */
  get parentId() {
    const parentData = this.getParentData();
    return parentData.parentId;
  }

  get traceFlags() {
    const parentData = this.getParentData();
    return parentData.sampled ? TraceFlags.SAMPLED : TraceFlags.NONE;
  }

  /**
   * Returns the sampled flag from the traceparent header.
   */
  get sampled() {
    const parentData = this.getParentData();
    return parentData.sampled;
  }

  /**
   * Returns any extra fields from the traceparent header.
   */
  get extraFields() {
    const parentData = this.getParentData();
    return parentData.extraFields;
  }

  /**
   * Returns the current Trace State
   */
  get traceState() {
    return this.getTraceState();
  }

  /**
   * Returns a value from the trace state.
   * See also https://deno.land/x/w3_trace_state/mod.ts?s=getTraceStateValue
   */
  getTraceStateValue(key: string): string | undefined {
    return w3TraceState.getTraceStateValue(this.getTraceState(), key);
  }

  /**
   * Adds a value to the trace state.
   * See also https://deno.land/x/w3_trace_state/mod.ts?s=addTraceStateValue
   */
  addTraceStateValue(key: string, value: string): void {
    this.traceStateData = w3TraceState.addTraceStateValue(
      this.getTraceState(),
      key,
      value
    );
  }

  /**
   * Updates a value in the trace state.
   * See also https://deno.land/x/w3_trace_state/mod.ts?s=updateTraceStateValue
   */
  updateTraceStateValue(key: string, value: string): void {
    this.traceStateData = w3TraceState.updateTraceStateValue(
      this.getTraceState(),
      key,
      value
    );
  }

  /**
   * Removes a value from the trace state.
   * See also https://deno.land/x/w3_trace_state/mod.ts?s=deleteTraceStateValue
   */
  deleteTraceStateValue(key: string): void {
    this.traceStateData = w3TraceState.deleteTraceStateValue(
      this.getTraceState(),
      key
    );
  }
}

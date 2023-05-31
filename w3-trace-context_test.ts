import {
  assertEquals,
  assertFalse,
  assertThrows,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.190.0/testing/bdd.ts";
import { W3TraceContext } from "./w3-trace-context.ts";
import { bufferToHexstring } from "./buffer-to-hexstring.ts";
import { assert } from "https://deno.land/std@0.188.0/_util/asserts.ts";
import { SimpleIdGenerator } from "https://deno.land/x/w3_trace_id_generator@v1.0.0/mod.ts";
import { isValidId } from "./parse-trace-parent.ts";
import { w3TraceState } from "./deps.ts";
import {
  addTraceStateValue,
  getEmptyTraceState,
} from "https://deno.land/x/w3_trace_state@v1.1.0/trace_state.ts";

// From https://www.w3.org/TR/2021/REC-trace-context-1-20211123/#examples-of-http-traceparent-headers
const EXAMPLE_1 = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
const EXAMPLE_2 = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00";

const EXAMPLE_TRACE_ID = new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
]);
const EXAMPLE_PARENT_ID = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
const INVALID_TRACE_ID = new Uint8Array(16);
const INVALID_PARENT_ID = new Uint8Array(8);

describe("W3TraceContext", () => {
  it("handles W3C Example 1", () => {
    const headers = new Headers();
    headers.set("traceparent", EXAMPLE_1);

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "4bf92f3577b34da6a3ce929d0e0e4736",
    );
    assertEquals(bufferToHexstring(context.parentId), "00f067aa0ba902b7");
    assertEquals(context.sampled, true);
    assertEquals(context.extraFields, []);
  });

  it("handles W3C Example 2", () => {
    const headers = new Headers();
    headers.set("traceparent", EXAMPLE_2);

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "4bf92f3577b34da6a3ce929d0e0e4736",
    );
    assertEquals(bufferToHexstring(context.parentId), "00f067aa0ba902b7");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  it("handles unknown Version numbers", () => {
    const headers = new Headers();
    headers.set(
      "traceparent",
      "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
    );

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 1);
    assertEquals(
      bufferToHexstring(context.traceId),
      "4bf92f3577b34da6a3ce929d0e0e4736",
    );
    assertEquals(bufferToHexstring(context.parentId), "00f067aa0ba902b7");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  it("handles invalid Trace Parents (corrupted)", () => {
    const headers = new Headers();
    headers.set("traceparent", "d-s-c-s");

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "00000000000000000000000000000000",
    );
    assertEquals(bufferToHexstring(context.parentId), "0000000000000000");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  it("handles invalid Trace Parents (all 0s)", () => {
    const headers = new Headers();
    headers.set(
      "traceparent",
      "00-00000000000000000000000000000000-0000000000000000-00",
    );

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "00000000000000000000000000000000",
    );
    assertEquals(bufferToHexstring(context.parentId), "0000000000000000");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  it("handles unexpected extra fields (v0)", () => {
    const headers = new Headers();
    headers.set(
      "traceparent",
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00-01234-5678",
    );

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "00000000000000000000000000000000",
    );
    assertEquals(bufferToHexstring(context.parentId), "0000000000000000");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  it("handles extra fields for unknown versions", () => {
    const headers = new Headers();
    headers.set(
      "traceparent",
      "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00-01234-5678",
    );

    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 1);
    assertEquals(
      bufferToHexstring(context.traceId),
      "4bf92f3577b34da6a3ce929d0e0e4736",
    );
    assertEquals(bufferToHexstring(context.parentId), "00f067aa0ba902b7");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, ["01234", "5678"]);
  });

  it("handles no Trace State", () => {
    const headers = new Headers();
    const context = W3TraceContext.fromHeaders(headers);
    assertEquals(context.traceState, []);
  });

  it("handles mo Trace Parent", () => {
    const headers = new Headers();
    const context = W3TraceContext.fromHeaders(headers);

    assertEquals(context.version, 0);
    assertEquals(
      bufferToHexstring(context.traceId),
      "00000000000000000000000000000000",
    );
    assertEquals(bufferToHexstring(context.parentId), "0000000000000000");
    assertEquals(context.sampled, false);
    assertEquals(context.extraFields, []);
  });

  describe("traceparent", () => {
    it("get traceparent header when one exists", () => {
      const headers = new Headers();
      headers.set("traceparent", EXAMPLE_1);

      const context = W3TraceContext.fromHeaders(headers);

      const newHeaders = context.toHeaders();
      assert(newHeaders.has("traceparent"));
      assertEquals(newHeaders.get("traceparent"), EXAMPLE_1);
    });

    it("does not create traceparent header when none exists", () => {
      const headers = new Headers();

      const context = W3TraceContext.fromHeaders(headers);

      const newHeaders = context.toHeaders();
      assertFalse(newHeaders.has("traceparent"));
    });
  });

  it("does not alter other headers", () => {
    const headers = new Headers();
    headers.set("traceparent", EXAMPLE_1);

    const context = W3TraceContext.fromHeaders(headers);

    let newHeaders = new Headers({ "x-test": "test" });
    newHeaders = context.toHeaders(newHeaders);
    assert(newHeaders.has("traceparent"));
    assert(newHeaders.has("x-test"));
    assertEquals(newHeaders.get("traceparent"), EXAMPLE_1);
    assertEquals(newHeaders.get("x-test"), "test");
  });

  describe("tracestate", () => {
    it("handles tracestate headers when missing", () => {
      const headers = new Headers();
      headers.set("tracestate", "");

      const context = W3TraceContext.fromHeaders(headers);
      const newHeaders = context.toHeaders();

      assertFalse(
        newHeaders.has("tracestate"),
        "tracestate header should be absent",
      );
    });

    it("handles tracestate headers when updated", () => {
      const headers = new Headers();
      headers.set("tracestate", "foo=1,bar=2");

      const context = W3TraceContext.fromHeaders(headers);
      context.addTraceStateValue("baz", "3");
      context.deleteTraceStateValue("bar");

      const newHeaders = context.toHeaders();

      assert(newHeaders.has("tracestate"));
      assertEquals(newHeaders.get("tracestate"), "baz=3,foo=1");
    });

    it("provides an API for tracestate interaction", () => {
      const context = W3TraceContext.fromScratch(
        {
          generator: new SimpleIdGenerator(),
          sampled: true,
        },
        [{ key: "foo", value: "2" }] as w3TraceState.TraceState,
      );
      assertEquals(context.getTraceStateValue("foo"), "2");

      context.addTraceStateValue("bar", "3");
      assertEquals(context.getTraceStateValue("bar"), "3");

      context.deleteTraceStateValue("foo");
      assertEquals(context.getTraceStateValue("foo"), undefined);

      context.updateTraceStateValue("bar", "4");
      assertEquals(context.getTraceStateValue("bar"), "4");
    });
  });

  describe("W3TraceContext.fromScratch", () => {
    it("creates an empty context", () => {
      const context = W3TraceContext.fromScratch({
        generator: new SimpleIdGenerator(),
      });
      assertEquals(context.version, 0);
      assertFalse(context.sampled);
      assert(isValidId(context.traceId));
      assert(isValidId(context.parentId));
      assertEquals(context.extraFields, []);
      assertEquals(context.traceState, []);
    });

    it("creates an empty context with the sampled flag set", () => {
      const context = W3TraceContext.fromScratch({
        generator: new SimpleIdGenerator(),
        sampled: true,
      });
      assertEquals(context.version, 0);
      assertEquals(context.sampled, true);
      assert(isValidId(context.traceId));
      assert(isValidId(context.parentId));
      assertEquals(context.extraFields, []);
      assertEquals(context.traceState, []);
    });

    it("supports the adding of a TraceState", () => {
      const context = W3TraceContext.fromScratch(
        {
          generator: new SimpleIdGenerator(),
          sampled: true,
        },
        [{ key: "foo", value: "2" }] as w3TraceState.TraceState,
      );
      assertEquals(context.version, 0);
      assertEquals(context.sampled, true);
      assert(isValidId(context.traceId));
      assert(isValidId(context.parentId));
      assertEquals(context.extraFields, []);
      assertEquals(context.traceState, [
        {
          key: "foo",
          value: "2",
        },
      ]);
    });
  });

  describe("W3TraceContext.fromTraceData", () => {
    it("can be created with just traceparent data", () => {
      const context = W3TraceContext.fromTraceData({
        version: 0,
        traceId: EXAMPLE_TRACE_ID,
        parentId: EXAMPLE_PARENT_ID,
        sampled: true,
        extraFields: [],
      });
      assertEquals(context.version, 0);
      assert(context.sampled);
      assert(isValidId(context.traceId));
      assert(isValidId(context.parentId));
      assertEquals(context.extraFields, []);
      assertEquals(context.traceState, []);
    });

    it("handles invalid Trace IDs", () => {
      assertThrows(() =>
        W3TraceContext.fromTraceData({
          version: 0,
          traceId: INVALID_TRACE_ID,
          parentId: EXAMPLE_PARENT_ID,
          sampled: true,
          extraFields: [],
        })
      );
    });
    it("handles invalid Parent IDs", () => {
      assertThrows(() =>
        W3TraceContext.fromTraceData({
          version: 0,
          traceId: EXAMPLE_TRACE_ID,
          parentId: INVALID_PARENT_ID,
          sampled: true,
          extraFields: [],
        })
      );
    });

    it("can be created with traceparent and tracestate data", () => {
      const state = addTraceStateValue(getEmptyTraceState(), "foo", "2");
      const context = W3TraceContext.fromTraceData(
        {
          version: 0,
          traceId: EXAMPLE_TRACE_ID,
          parentId: EXAMPLE_PARENT_ID,
          sampled: true,
          extraFields: [],
        },
        state,
      );
      assertEquals(context.version, 0);
      assert(context.sampled);
      assert(isValidId(context.traceId));
      assert(isValidId(context.parentId));
      assertEquals(context.extraFields, []);
      assertEquals(context.traceState, [{ key: "foo", value: "2" }]);
      assertEquals(context.getTraceStateValue("foo"), "2");
    });
  });
});

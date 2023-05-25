import { assertEquals } from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { W3TraceContext } from "./w3-trace-context.ts";

const decoder = new TextDecoder();

// From https://www.w3.org/TR/2021/REC-trace-context-1-20211123/#examples-of-http-traceparent-headers
const EXAMPLE_1 = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
const EXAMPLE_2 = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00";

Deno.test("W3 Example 1", () => {
  const headers = new Headers();
  headers.set("traceparent", EXAMPLE_1);

  const context = W3TraceContext.fromHeaders(headers);

  assertEquals(context.version, 0);
  assertEquals(
    decoder.decode(context.traceId),
    "4bf92f3577b34da6a3ce929d0e0e4736"
  );
});

import { assertThrows } from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { parseTraceParent } from "./parse-trace-parent.ts";

Deno.test("parseTraceParent: empty string", () => {
  assertThrows(() => parseTraceParent(""));
});

Deno.test("parseTraceParent: short trace id", () => {
  assertThrows(() =>
    parseTraceParent("00-000102030405060708090a0b0c0-0123456-00")
  );
});

Deno.test("parseTraceParent: short parent id", () => {
  assertThrows(() =>
    parseTraceParent("00-000102030405060708090a0b0c0d0e0f-0123456-00")
  );
});

Deno.test("parseTraceParent: short trace flags", () => {
  assertThrows(() =>
    parseTraceParent("00-000102030405060708090a0b0c0d0e0f-0001020304050607-0")
  );
});

Deno.test("parseTraceParent: invalid trace id", () => {
  assertThrows(() =>
    parseTraceParent("00-00000000000000000000000000000000-0001020304050607-00")
  );
});

Deno.test("parseTraceParent: invalid parent id", () => {
  assertThrows(() =>
    parseTraceParent("00-000102030405060708090a0b0c0d0e0f-0000000000000000-00")
  );
});

Deno.test("parseTraceParent: extra fields in v0", () => {
  assertThrows(() =>
    parseTraceParent(
      "00-000102030405060708090a0b0c0d0e0f-0001020304050607-01-1234"
    )
  );
});

import { assertEquals } from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { uint8ArrayFromHexString } from "./typed-array-from-hexstring.ts";

const assertArrayMatch = <T>(expected: ArrayLike<T>, actual: ArrayLike<T>) => {
  assertEquals(actual.length, expected.length, `Arrays are the same length`);
  for (let i = 0; i <= expected.length; i++) {
    assertEquals(actual[i], expected[i], `Values at index ${i} match`);
  }
};

Deno.test("uint8ArrayFromHexString", async (t) => {
  await t.step("handles an empty string", () => {
    assertArrayMatch(uint8ArrayFromHexString(""), new Uint8Array([]));
  });
  await t.step("handles a one character string", () => {
    assertArrayMatch(uint8ArrayFromHexString("1"), new Uint8Array([1]));
    assertArrayMatch(uint8ArrayFromHexString("f"), new Uint8Array([15]));
  });
  await t.step("handles a two character string", () => {
    assertArrayMatch(uint8ArrayFromHexString("10"), new Uint8Array([16]));
    assertArrayMatch(uint8ArrayFromHexString("ff"), new Uint8Array([255]));
  });
  await t.step("handles a two byte word", () => {
    assertArrayMatch(uint8ArrayFromHexString("0000"), new Uint8Array([0, 0]));
    assertArrayMatch(uint8ArrayFromHexString("1234"), new Uint8Array([18, 52]));
    assertArrayMatch(
      uint8ArrayFromHexString("ffff"),
      new Uint8Array([255, 255]),
    );
  });
  await t.step("handles odd numbered character string", () => {
    assertArrayMatch(uint8ArrayFromHexString("101"), new Uint8Array([1, 1]));
    assertArrayMatch(uint8ArrayFromHexString("022"), new Uint8Array([0, 34]));
  });
  await t.step("handles mixed-case character string", () => {
    assertArrayMatch(uint8ArrayFromHexString("aB"), new Uint8Array([171]));
    assertArrayMatch(uint8ArrayFromHexString("Ab"), new Uint8Array([171]));
  });
});

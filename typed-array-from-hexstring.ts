/**
 * Given a hexstring, returns a big-endian representation of that number
 */
export const uint8ArrayFromHexString = (hexstring: string) => {
  if (hexstring.length % 2 !== 0) {
    hexstring = `0${hexstring}`;
  }
  const byteStrings = hexstring.match(/.{2}/g) ?? [];
  const byteArray = byteStrings.map((byte) => parseInt(byte, 16));
  return new Uint8Array(byteArray);
};

export const bufferToHexstring = (buffer: Uint8Array): string =>
  Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

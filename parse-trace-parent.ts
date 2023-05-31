import { InvalidError } from "./exceptions/invalid-error.ts";
import { UnparseableError } from "./exceptions/unparseable-error.ts";
import { uint8ArrayFromHexString } from "./typed-array-from-hexstring.ts";

/**
 * This represents the constituent parts of a traceparent header
 */
export interface TraceParentData {
  version: number;
  traceId: Uint8Array;
  parentId: Uint8Array;
  sampled: boolean;
  extraFields: string[];
}

export const isValidId = (traceId: Uint8Array): boolean =>
  traceId.some((byte) => byte !== 0);

export const parseTraceParent = (asString: string): TraceParentData => {
  const version = parseInt(asString.slice(0, 2), 16);

  if (version === undefined) {
    throw new UnparseableError("Invalid value for traceparent");
  }

  const result = {
    version: 0,
    traceId: new Uint8Array([]),
    parentId: new Uint8Array([]),
    sampled: false,
    extraFields: [] as string[],
  };
  const [, traceId, parentId, traceFlags, ...extraFields] = asString.split("-");
  if (traceId?.length !== 32) {
    throw new UnparseableError(
      "Trace ID found in traceparent is the wrong length"
    );
  }
  if (parentId?.length !== 16) {
    throw new UnparseableError(
      "Parent ID found in traceparent is the wrong length"
    );
  }
  if (traceFlags?.length !== 2) {
    throw new UnparseableError(
      "TraceFlags found in traceparent is the wrong length"
    );
  }

  result.version = version;
  result.traceId = uint8ArrayFromHexString(traceId);
  result.parentId = uint8ArrayFromHexString(parentId);
  result.sampled = (parseInt(traceFlags, 16) & 0x01) === 0x01;

  if (!isValidId(result.traceId)) {
    throw new InvalidError("Invalid Trace ID found in traceparent");
  }
  if (!isValidId(result.parentId)) {
    throw new InvalidError("Invalid Parent ID found in traceparent");
  }

  if (version === 0) {
    if (extraFields.length !== 0) {
      throw new InvalidError("Extra fields found in traceparent v0");
    }

    return result;
  }

  if (asString.length < 55) {
    throw new InvalidError("Value for traceparent is too short");
  }

  result.extraFields = extraFields;

  return result;
};

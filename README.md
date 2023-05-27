# w3-trace-context

This is a Deno implementation of the [W3 Trace Context recommendation](https://www.w3.org/TR/2021/REC-trace-context-1-20211123/). Specifically, it's the 23 November 2021 version.

This class can be used to handle Trace Context, according to the W3 recommendation above. It also corresponds to the [OpenTelemetry Context](https://opentelemetry.io/docs/specs/otel/context/).

## Usage

The `W3TraceContext` cannot be instantiated directly. Instead, it can be created from HTTP headers or created by passing it an [`IdGenerator`](https://deno.land/x/w3_trace_id_generator)

### From HTTP Headers

```
const w3TraceContext = W3TraceContext.fromHeaders(requestHeaders);
```

### From Scratch

```
const w3TraceContext = W3TraceContext.fromScratch({generator: new SimpleIdGenerator(), sampled: true}, traceState);
```

### Trace Parent

Trace Parent information can be pulled directly from the context:

```
const traceId = w3TraceContext.traceId;
const parentId = w3TraceContext.parentId;
```

### Trace State

Trace State information can be interacted with via methods that correspond to the functions available in the [W3 Trace State module](https://deno.land/x/w3_trace_state/mod.ts):

```
const getOtelState = w3TraceContext.getTraceStateValue('otel');
w3TraceContext.updateTraceStateValue('otel','1234');
```

While the `TraceState` object is immutable, the method calls on `W3TraceContext` that interact with trace state will update its own internal state. However, no mutation will occur to any externally reference `TraceState`s.

## Deno module

This repository is available as a Deno module at https://deno.land/x/w3_trace_context

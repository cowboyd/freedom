# Freedom

A general-purpose abstract component tree built on [Effection](https://frontside.com/effection) structured concurrency. Freedom ("free DOM") maintains a tree of long-lived, stateful component nodes where each node is an Effection resource with a scope, a JSON-like property bag, and ordered children. It is designed to accept a firehose of events of any type through a single synchronous `dispatch()` entry point, and emit change notifications on an output stream for renderers to consume.

## Specs

- [Freedom Specification](specs/freedom-spec.md)
- [Freedom Conformance Test Plan](specs/freedom-test-plan.md)

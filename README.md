# Freedom

A general-purpose abstract component tree built on [Effection](https://frontside.com/effection) structured concurrency. Freedom ("free DOM") maintains a tree of long-lived, stateful component nodes where each node is an Effection resource with a scope, a JSON-like property bag, and ordered children. It is designed to accept a firehose of events of any type through a single synchronous `dispatch()` entry point, and emit change notifications on an output stream for renderers to consume.

## Specs

- [Freedom Specification](specs/freedom-spec.md)
- [Freedom Conformance Test Plan](specs/freedom-test-plan.md)

## Extension Modules

Freedom is extensible through extension modules — operations installed by the root component that add capabilities to the tree using Freedom's context APIs. Extensions use middleware interception, scoped evaluation, and the property bag to layer behavior without modifying the core.

### Focus

The [Focus extension](specs/freedom-focus-spec.md) tracks which node in the tree is currently receiving input. Focus state is observable as a regular node property (`node.props.focused`), and the focus chain is derived from the tree by depth-first traversal. See the [research summary](research/focus.md) for background on focus management across UI paradigms.

Install focus in the root component:

```ts
function* app(): Operation<void> {
  yield* useFocus();
  // ... rest of app
}
```

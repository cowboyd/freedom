import { spawn, suspend, withResolvers, type Api, type Operation } from "effection";
import { createApi } from "effection/experimental";
import type { Component, JsonValue, Node } from "./types.ts";
import { NodeContext, NodeImpl, spawnEvalLoop } from "./node.ts";
import { TreeContext } from "./state.ts";
import { validateJsonValue } from "./validate.ts";

export interface Freedom {
  set(key: string, value: JsonValue): Operation<void>;
  update(
    key: string,
    fn: (prev: JsonValue | undefined) => JsonValue,
  ): Operation<void>;
  unset(key: string): Operation<void>;
  append(name: string, component: Component): Operation<Node>;
  sort(fn: ((a: Node, b: Node) => number) | undefined): Operation<void>;
}

export const FreedomApi: Api<Freedom> = createApi<Freedom>("freedom:node", {
  *set(key: string, value: JsonValue) {
    validateJsonValue(value);
    let node = yield* NodeContext.expect();
    node._props[key] = value;
  },

  *update(key: string, fn: (prev: JsonValue | undefined) => JsonValue) {
    let node = yield* NodeContext.expect();
    let prev = node._props[key];
    let next = fn(prev);
    validateJsonValue(next);
    node._props[key] = next;
  },

  *unset(key: string) {
    let node = yield* NodeContext.expect();
    if (key in node._props) {
      delete node._props[key];
    }
  },

  *append(name: string, component: Component): Operation<Node> {
    let parent = yield* NodeContext.expect();
    let tree = yield* TreeContext.expect();
    let child = new NodeImpl(tree.nextId(), name, parent);
    let ready = withResolvers<void>();

    let task = yield* spawn(function* () {
      parent._children.add(child);
      tree.nodes.set(child.id, child);
      yield* NodeContext.set(child);
      yield* spawnEvalLoop(child._channel);
      ready.resolve();
      try {
        yield* component();
        yield* suspend();
      } finally {
        parent._children.delete(child);
        tree.nodes.delete(child.id);
        tree.markDirty();
      }
    });
    child.remove = task.halt;

    yield* ready.operation;
    return child;
  },

  *sort(fn: ((a: Node, b: Node) => number) | undefined) {
    let node = yield* NodeContext.expect();
    node._sortFn = fn;
  },
});

export const set: typeof FreedomApi.operations.set = FreedomApi.operations.set;
export const update: typeof FreedomApi.operations.update = FreedomApi.operations.update;
export const unset: typeof FreedomApi.operations.unset = FreedomApi.operations.unset;
export const append: typeof FreedomApi.operations.append = FreedomApi.operations.append;
export const sort: typeof FreedomApi.operations.sort = FreedomApi.operations.sort;

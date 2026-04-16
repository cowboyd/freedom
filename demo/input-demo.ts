import {
  createChannel,
  each,
  main,
  type Operation,
  race,
  resource,
  sleep,
  spawn,
  type Stream,
  suspend,
  until,
} from "effection";

import {
  advance,
  current,
  DispatchApi,
  focusable,
  retreat,
  useFocus,
  useTree,
} from "../lib/mod.ts";

import { NodeContext } from "../lib/node.ts";
import {
  close,
  createInput,
  createTerm,
  KeyDown,
  KeyEvent,
  KeyRepeat,
  KeyUp,
  Op,
  open,
  text,
} from "@clayterm/clayterm";

import { useInput } from "./use-input.ts";
import { useStdin } from "./use-stdin.ts";
import { append, createNodeData, type Node } from "@frontside/freedom";
import { createApi } from "effection/experimental";

const InputApi = createApi("clayterm:input", {
  *keydown(event: KeyDown): Operation<void> {
    if (event.code == "Tab") {
      yield* advance();
      let focused = yield* current();
    } else if (event.code === "Backtab") {
      yield* retreat();
      let focused = yield* current();
    }
  },
  *keyup(event: KeyUp): Operation<void> {
    // no-op
  },
  *keyrepeat(event: KeyRepeat): Operation<void> {
    if (event.code == "Tab") {
      yield* advance();
    } else if (event.code === "Backtab") {
      yield* retreat();
    }
  },
});

function onkeydown(
  handler: (
    event: KeyDown,
    next: (event: KeyDown) => Operation<void>,
  ) => Operation<void>,
): Operation<void> {
  return InputApi.around({
    keydown([event], next) {
      return handler(event, next);
    },
  });
}

function* useNode() {
  let node = yield* NodeContext.expect();
  return node;
}

const layoutKey = createNodeData("herpderp", () => []);

interface LayoutOptions {
  node: Node;
  children: Iterable<Op>;
}

function* layout(body: (props: LayoutOptions) => Op[]): Operation<void> {
  let node = yield* useNode();
  node.data.set(layoutKey, body);
}

await main(function* () {
  let tree = yield* useTree(function* () {
    yield* useFocus();

    yield* DispatchApi.around({
      *dispatch([event], next) {
        if (isKeyboardEvent(event)) {
          let focus = yield* current();
          let result = yield* focus.eval(function* () {
            let handler = InputApi.operations[event.type];
            yield* handler(event as any);
          });
          return result.ok ? { ok: true, value: true } : result;
        }
        return yield* next(event);
      },
    });

    yield* append("input-1", function* () {
      yield* layout(({ node, children }) => {
        return [
          open(node.id, {
            border: { color: 0xFFF, top: 1, right: 1, bottom: 1, left: 1 },
          }),
          ...children,
          close(),
        ];
      });

      yield* onkeydown(function* (event, next) {
        console.log("component 1:capture", { event });
        yield* next(event);
      });

      yield* append("input-1-1", function* () {
        yield* layout(({ node, children }) => {
          let cn = { color: 0x0FF, top: 1, right: 1, bottom: 1, left: 1 };
          let border = node.props.focused ? cn : ({});
          return [
            open(node.id, { border }),
            text("asdfas"),
            close(),
          ];
        });
        yield* focusable();
        yield* onkeydown(function* (event, next) {
          console.log("component 1-1:capture", { event });
          yield* next(event);
        });
      });

      yield* append("input-1-2", function* () {
        yield* focusable();
        yield* onkeydown(function* (event, next) {
          console.log("component 1-2", { event });
          yield* next(event);
        });
      });
    });

    yield* append("input-2", function* () {
      yield* onkeydown(function* (event, next) {
        console.log("component 2:capture", { event });
        yield* next(event);
      });
      yield* focusable();
    });
  });

  let { columns, rows } = Deno.stdout.isTerminal()
    ? Deno.consoleSize()
    : { columns: 80, rows: 24 };

  Deno.stdin.setRaw(true);
  let stdin = yield* useStdin();
  let input = useInput(stdin);

  let term = yield* until(createTerm({ height: rows, width: columns }));

  let events = yield* spawn(function* () {
    for (let event of yield* each(input)) {
      if (event.type == "keydown") {
        if (event.ctrl && event.code == "c") {
          break;
        }
      }
      if (event.type == "resize") {
        term = yield* until(createTerm({
          height: event.height,
          width: event.width,
        }));
      }
      let _ = tree.dispatch(event);
      yield* each.next();
    }
  });

  // render
  yield* spawn(function* () {
    let ops = [];
    for (let _ of yield* each(tree)) {
    }
  });

  yield* events;
});

function walk(node: Node, ops: Op[]) {
  for (let child of node.children) {
  }
}

function isKeyboardEvent(event: unknown): event is KeyEvent {
  let x = event as KeyEvent;
  return !!x && typeof (x.key) === "string" && typeof (x.code) === "string" &&
    ["keyup", "keydown", "keyrepeat"].includes(x.type);
}

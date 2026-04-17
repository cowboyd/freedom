import { each, main, type Operation, spawn, until } from "effection";

import {
  advance,
  current,
  DispatchApi,
  focusable,
  retreat,
  set,
  type Tree,
  update,
  useFocus,
  useTree,
} from "../lib/mod.ts";

import { NodeContext } from "../lib/node.ts";
import {
  alternateBuffer,
  close,
  createTerm,
  cursor,
  fit,
  grow,
  type KeyDown,
  type KeyEvent,
  type KeyRepeat,
  type KeyUp,
  type Op,
  open,
  percent,
  rgba,
  settings,
  text,
} from "@clayterm/clayterm";

import { useInput } from "./use-input.ts";
import { useStdin } from "./use-stdin.ts";
import { append, createNodeData, type Node } from "@frontside/freedom";
import { createApi } from "effection/experimental";

const GRAY = rgba(100, 100, 100);

const InputApi = createApi("clayterm:input", {
  *keydown(event: KeyDown): Operation<void> {
    if (event.code == "Tab") {
      yield* advance();
    } else if (event.code === "Backtab") {
      yield* retreat();
    }
  },
  *keyup(_event: KeyUp): Operation<void> {
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

const layoutKey = createNodeData<(options: LayoutOptions) => Op[]>(
  "herpderp",
  () => [],
);

interface LayoutOptions {
  node: Node;
  children: Iterable<Op>;
}

function* layout(body: (props: LayoutOptions) => Op[]): Operation<void> {
  let node = yield* useNode();
  node.data.set(layoutKey, body);
}

function* useTextInput(): Operation<void> {
  yield* focusable();
  yield* set("value", "");
  yield* onkeydown(function* (event, next) {
    if (event.key.length === 1) {
      yield* update("value", (v) => `${v ?? ""}${event.key}`);
    } else if (event.code === "Backspace") {
      yield* update("value", (v) => {
        let str = String(v ?? "");
        return str.slice(0, -1);
      });
    } else {
      yield* next(event);
    }
  });
}

await main(function* () {
  let tree = yield* useTree(function* () {
    yield* useFocus();
    yield* layout(({ node, children }) => {
      return [
        open(node.id, {
          layout: {
            height: grow(),
            width: grow(),
            direction: "ttb",
            padding: { top: 1, right: 1, bottom: 1, left: 1 },
          },
          border: {
            color: rgba(255, 255, 255),
            top: 1,
            right: 1,
            bottom: 1,
            left: 1,
          },
        }),
        ...children,
        close(),
      ];
    });

    yield* DispatchApi.around({
      *dispatch([event], next) {
        if (isKeyboardEvent(event)) {
          let focus = yield* current();
          let result = yield* focus.eval(function* () {
            let handler = InputApi.operations[event.type];
            yield* handler(event as KeyDown & KeyUp & KeyRepeat);
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
            layout: {
              height: fit(),
              width: grow(),
              direction: "ttb",
              padding: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          }),
          ...children,
          close(),
        ];
      });

      yield* append("input-1-1", function* () {
        yield* useTextInput();
        yield* layout(({ node }) => {
          let color = node.props.focused ? rgba(255, 255, 255) : GRAY;
          let border = { color, top: 1, right: 1, bottom: 1, left: 1 };
          return [
            open(node.id, {
              border,
              layout: {
                height: fit(3),
                width: percent(0.3),
                padding: { top: 1, right: 1, bottom: 1, left: 1 },
              },
            }),
            text(String(node.props.value ?? "")),
            close(),
          ];
        });
      });

      yield* append("input-1-2", function* () {
        yield* useTextInput();
        yield* layout(({ node }) => {
          let color = node.props.focused ? rgba(255, 255, 255) : GRAY;
          let border = { color, top: 1, right: 1, bottom: 1, left: 1 };
          return [
            open(node.id, {
              border,
              layout: {
                height: fit(3),
                width: percent(0.3),
                padding: { top: 1, right: 1, bottom: 1, left: 1 },
              },
            }),
            text(String(node.props.value ?? "")),
            close(),
          ];
        });
      });
    });

    yield* append("input-2", function* () {
      yield* useTextInput();
      yield* layout(({ node }) => {
        let color = node.props.focused ? rgba(255, 255, 255) : GRAY;
        let border = { color, top: 1, right: 1, bottom: 1, left: 1 };
        return [
          open(node.id, {
            border,
            layout: {
              height: fit(3),
              width: percent(0.3),
              padding: { top: 1, right: 1, bottom: 1, left: 1 },
            },
          }),
          text(String(node.props.value ?? "")),
          close(),
        ];
      });
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

      tree.dispatch(event);

      yield* each.next();
    }
  });

  function render(tree: Tree) {
    let ops = walk(tree.root);
    let { output } = term.render(ops);
    Deno.stdout.writeSync(output);
  }

  let tty = settings(cursor(false), alternateBuffer());

  try {
    Deno.stdout.writeSync(tty.apply);

    render(tree);
    yield* spawn(function* () {
      for (let _ of yield* each(tree)) {
        render(tree);
        yield* each.next();
      }
    });

    yield* events;
  } finally {
    Deno.stdout.writeSync(tty.revert);
  }
});

function walk(node: Node): Op[] {
  let children: Op[] = [];
  for (let child of node.children) {
    children.push(...walk(child));
  }
  let layout = node.data.get(layoutKey);
  return layout ? layout({ node, children }) : children;
}

function isKeyboardEvent(event: unknown): event is KeyEvent {
  let x = event as KeyEvent;
  return !!x && typeof (x.key) === "string" && typeof (x.code) === "string" &&
    ["keyup", "keydown", "keyrepeat"].includes(x.type);
}

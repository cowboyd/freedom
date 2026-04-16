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
import {
  createInput,
  createTerm,
  KeyDown,
  KeyEvent,
  KeyRepeat,
  KeyUp,
} from "@clayterm/clayterm";

import { useInput } from "./use-input.ts";
import { useStdin } from "./use-stdin.ts";
import { append } from "@frontside/freedom";
import { FreedomApi } from "../lib/freedom.ts";
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
      yield* onkeydown(function* (event, next) {
        yield* focusable();
        console.log("component 1:capture", { event });
        yield* next(event);
      });

      yield* append("input-1-1", function* () {
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

  // render loop
  yield* spawn(function* () {
    for (let _ of yield* each(tree)) {
      // need something to render too?
      yield* each.next();
    }
  });

  Deno.stdin.setRaw(true);
  let stdin = yield* useStdin();
  let input = useInput(stdin);

  for (let event of yield* each(input)) {
    if (event.type == "keydown") {
      if (event.ctrl && event.code == "c") {
        break;
      }
    }
    tree.dispatch(event);
    yield* each.next();
  }
});

function isKeyboardEvent(event: unknown): event is KeyEvent {
  let x = event as KeyEvent;
  return !!x && typeof (x.key) === "string" && typeof (x.code) === "string" &&
    ["keyup", "keydown", "keyrepeat"].includes(x.type);
}

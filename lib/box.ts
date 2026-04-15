import type { Operation, Result } from "effection";

export function* box<T>(op: () => Operation<T>): Operation<Result<T>> {
  try {
    return { ok: true, value: yield* op() };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}

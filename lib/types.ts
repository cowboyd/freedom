import type { Operation, Result, Stream } from "effection";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Component = () => Operation<void>;

export interface Node {
  readonly id: string;
  readonly name: string;
  readonly props: Record<string, JsonValue>;
  readonly children: Iterable<Node>;
  readonly parent: Node | undefined;
  eval<T>(op: () => Operation<T>): Operation<Result<T>>;
  remove(): Operation<void>;
}

export interface Tree extends Stream<void, never> {
  dispatch(event: unknown): void;
  root: Node;
}

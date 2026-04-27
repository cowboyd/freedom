import { build, emptyDir } from "dnt";

const outDir = "./build/npm";

await emptyDir(outDir);

const [version] = Deno.args;
if (!version) {
  throw new Error("a version argument is required to build the npm package");
}

await build({
  entryPoints: ["./mod.ts"],
  outDir,
  shims: {
    deno: false,
  },
  scriptModule: false,
  test: false,
  typeCheck: false,
  compilerOptions: {
    lib: ["ESNext", "DOM", "DOM.Iterable"],
    target: "ES2020",
    sourceMap: true,
  },
  package: {
    name: "@frontside/freedom",
    version,
    description:
      "A general-purpose abstract component tree built on Effection structured concurrency",
    license: "ISC",
    repository: {
      type: "git",
      url: "git+https://github.com/thefrontside/freedom.git",
    },
    bugs: {
      url: "https://github.com/thefrontside/freedom/issues",
    },
    engines: {
      node: ">= 20",
    },
    sideEffects: false,
  },
});

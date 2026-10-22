const { readFileSync, existsSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const { createRequire } = require("node:module");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

// Execute the real TS/TSX modules with explicit SDK/framework doubles.
// No new test framework, bundler, network requests, or credentials are needed.
exports.moduleLoader = function moduleLoader(overrides = {}) {
  const cache = new Map();
  function load(path) {
    const filename = resolve(__dirname, "../..", path);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    const requireDependency = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith(".")) {
        const base = name.startsWith("@/")
          ? resolve(__dirname, "../../src", name.slice(2))
          : resolve(dirname(filename), name);
        const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
        if (!target) throw new Error(`Missing test dependency: ${name}`);
        return load(target);
      }
      return nativeRequire(name);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename })(
      requireDependency, module, module.exports,
    );
    return module.exports;
  }
  return load;
};

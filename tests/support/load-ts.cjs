const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

exports.loadTS = (relativePath, imports = {}, globals = {}) => {
  const source = fs.readFileSync(
    path.join(__dirname, "../..", relativePath),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const result = {};
  vm.runInNewContext(compiled, {
    ...globals,
    exports: result,
    require(name) {
      if (!(name in imports))
        throw new Error(`Unexpected dependency in isolated test: ${name}`);
      return imports[name];
    },
    console,
  });
  return result;
};

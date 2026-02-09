module.exports = require("./build/Release/AudioEngine.node");

//Notes for future me:
/**
 * Native addon packaging + typings (CJS addon consumed by an ESM TypeScript app)
 * ---------------------------------------------------------------------------
 * The compiled N-API addon is a `.node` binary (build/Release/AudioEngine.node). Node loads native addons most reliably
 * via the CommonJS loader (`require()`), so this workspace package ("audio-engine") is deliberately CommonJS
 * (`"type": "commonjs"` in audio-engine/package.json). This file is the package entrypoint (`"main": "index.js"`)
 * and simply re-exports the addon with `module.exports = require("./build/Release/AudioEngine.node");`, meaning the
 * runtime export shape is CommonJS `module.exports`.
 *
 * To make TypeScript understand the API, we ship `index.d.ts` and point to it via `"types": "index.d.ts"`. The key
 * detail is that the declaration file uses `export = engine;` (NOT `export default`) to match the CommonJS
 * `module.exports` export shape. Under TS `module: "nodenext"`, this alignment matters; using `export default` can
 * cause TS to treat the import as a module namespace rather than the exported value.
 *
 * Because the root app is ESM (`"type": "module"`) and uses NodeNext resolution, it can do
 * `import engine from "audio-engine";` — Node/TS interop maps the CommonJS `module.exports` value to the ESM default
 * import, so the runtime works and the types come from `index.d.ts`. Workspaces create a symlink in
 * node_modules/audio-engine -> ./audio-engine, so `"audio-engine"` resolves like any normal dependency.
 */

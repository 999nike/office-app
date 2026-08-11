import test from "node:test";
import assert from "node:assert/strict";

const connectorUrl = new URL("../src/connectors/code-space.js", import.meta.url);

async function loadConnector(windowMock) {
  const previousWindow = globalThis.window;
  globalThis.window = windowMock;
  const module = await import(`${connectorUrl.href}?test=${crypto.randomUUID()}`);
  return {
    connector: module.codeSpaceConnector,
    restore() {
      globalThis.window = previousWindow;
    },
  };
}

test("reserves one named Code Space target at its real URL and reuses it", async () => {
  const calls = [];
  const target = { closed: false, focus() {} };
  const { connector, restore } = await loadConnector({
    open(...args) {
      calls.push(args);
      return target;
    },
  });

  try {
    assert.equal(connector.reserve(), target);
    assert.equal(connector.reserve(), target);
    assert.deepEqual(calls, [["http://127.0.0.1:8090/", "code-space"]]);
  } finally {
    restore();
  }
});

test("dispatch navigates the reserved target without opening another window", async () => {
  const calls = [];
  const target = { closed: false, focus() {}, location: "" };
  const { connector, restore } = await loadConnector({
    open(...args) {
      calls.push(args);
      return target;
    },
  });

  try {
    connector.reserve();
    await connector.dispatch({ format: "office-dispatch-package", packageStatus: "Ready", packageId: "package-1" });
    assert.equal(calls.length, 1);
    assert.match(target.location, /^http:\/\/127\.0\.0\.1:8090\/\?officeDispatch=/);
  } finally {
    restore();
  }
});

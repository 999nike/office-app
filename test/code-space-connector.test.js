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

test("dispatchMany sends one ordered batch to the existing Code Space tab without navigation", async () => {
  const calls = [];
  const messages = [];
  const target = { closed: false, focus() {}, location: "", postMessage(...args) { messages.push(args); } };
  const { connector, restore } = await loadConnector({
    open(...args) {
      calls.push(args);
      return target;
    },
  });

  try {
    connector.reserve();
    const packages = ["one", "two"].map((packageId) => ({ format: "office-dispatch-package", packageStatus: "Ready", packageId }));
    await connector.dispatchMany(packages);
    assert.equal(calls.length, 1);
    assert.equal(target.location, "");
    assert.equal(messages.length, 1);
    assert.equal(messages[0][0].type, "office-dispatch-batch-v1");
    assert.deepEqual(messages[0][0].packages.map((item) => item.packageId), ["one", "two"]);
    assert.equal(messages[0][1], "http://127.0.0.1:8090");
  } finally {
    restore();
  }
});

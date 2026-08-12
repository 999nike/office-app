import test from "node:test";
import assert from "node:assert/strict";

const connectorUrl = new URL("../src/connectors/code-space.js", import.meta.url);

function createHarness() {
  let messageHandler = null;
  let openCalls = 0;
  const messages = [];

  const contentWindow = {
    postMessage(message, origin) {
      messages.push([message, origin]);
      queueMicrotask(() => messageHandler?.({
        origin: "http://127.0.0.1:8090",
        data: {
          type: "code-space-dispatch-ack-v1",
          requestId: message.requestId,
          ok: true,
          packageIds: message.packages.map((item) => item.packageId),
        },
      }));
    },
  };

  const frame = {
    isConnected: false,
    contentWindow,
    hidden: false,
    src: "",
    title: "",
    setAttribute() {},
    addEventListener(type, callback) {
      if (type === "load") this.onLoad = callback;
      if (type === "error") this.onError = callback;
    },
  };

  const documentMock = {
    createElement(tag) {
      assert.equal(tag, "iframe");
      return frame;
    },
    body: {
      appendChild(node) {
        node.isConnected = true;
        queueMicrotask(() => node.onLoad?.());
      },
    },
  };

  const windowMock = {
    addEventListener(type, callback) {
      if (type === "message") messageHandler = callback;
    },
    open() {
      openCalls += 1;
      throw new Error("dispatch must never open a Code Space tab");
    },
  };

  return { documentMock, windowMock, frame, messages, getOpenCalls: () => openCalls };
}

async function loadConnector(harness) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = harness.windowMock;
  globalThis.document = harness.documentMock;
  const module = await import(`${connectorUrl.href}?test=${crypto.randomUUID()}`);
  return {
    connector: module.codeSpaceConnector,
    restore() {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    },
  };
}

test("reserve prepares a hidden Code Space bridge without opening a visible window", async () => {
  const harness = createHarness();
  const { connector, restore } = await loadConnector(harness);

  try {
    assert.equal(connector.reserve(), true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.getOpenCalls(), 0);
    assert.equal(harness.frame.hidden, true);
    assert.equal(harness.frame.src, "http://127.0.0.1:8090/office-dispatch-bridge.html");
  } finally {
    restore();
  }
});

test("single dispatch uses the hidden bridge and never opens or navigates Code Space", async () => {
  const harness = createHarness();
  const { connector, restore } = await loadConnector(harness);

  try {
    await connector.dispatch({ format: "office-dispatch-package", packageStatus: "Ready", packageId: "package-1" });
    assert.equal(harness.getOpenCalls(), 0);
    assert.equal(harness.messages.length, 1);
    assert.equal(harness.messages[0][0].type, "office-dispatch-submit-v1");
    assert.deepEqual(harness.messages[0][0].packages.map((item) => item.packageId), ["package-1"]);
    assert.equal(harness.messages[0][1], "http://127.0.0.1:8090");
  } finally {
    restore();
  }
});

test("dispatchMany sends one ordered batch through the same hidden bridge", async () => {
  const harness = createHarness();
  const { connector, restore } = await loadConnector(harness);

  try {
    const packages = ["one", "two"].map((packageId) => ({ format: "office-dispatch-package", packageStatus: "Ready", packageId }));
    await connector.dispatchMany(packages);
    assert.equal(harness.getOpenCalls(), 0);
    assert.equal(harness.messages.length, 1);
    assert.equal(harness.messages[0][0].type, "office-dispatch-submit-v1");
    assert.deepEqual(harness.messages[0][0].packages.map((item) => item.packageId), ["one", "two"]);
    assert.equal(harness.messages[0][1], "http://127.0.0.1:8090");
  } finally {
    restore();
  }
});

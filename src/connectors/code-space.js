const CODE_SPACE_URL = "http://127.0.0.1:8090/";
const CODE_SPACE_ORIGIN = new URL(CODE_SPACE_URL).origin;
const CODE_SPACE_BRIDGE_URL = `${CODE_SPACE_URL}office-dispatch-bridge.html`;
const ACK_TIMEOUT_MS = 5000;

let bridgeFrame = null;
let bridgeReady = null;
let ackListenerInstalled = false;
const pendingAcks = new Map();

function installAckListener() {
  if (ackListenerInstalled) return;
  ackListenerInstalled = true;
  window.addEventListener("message", (event) => {
    if (event.origin !== CODE_SPACE_ORIGIN || event.data?.type !== "code-space-dispatch-ack-v1") return;
    const requestId = String(event.data?.requestId || "");
    const pending = pendingAcks.get(requestId);
    if (!pending) return;
    pendingAcks.delete(requestId);
    clearTimeout(pending.timer);
    if (event.data?.ok === false) pending.reject(new Error(event.data?.error || "Code Space rejected the Office dispatch."));
    else pending.resolve(event.data);
  });
}

function ensureBridgeFrame() {
  installAckListener();
  if (bridgeFrame?.isConnected && bridgeFrame.contentWindow) return bridgeReady || Promise.resolve(bridgeFrame);

  bridgeFrame = document.createElement("iframe");
  bridgeFrame.src = CODE_SPACE_BRIDGE_URL;
  bridgeFrame.title = "Code Space dispatch bridge";
  bridgeFrame.hidden = true;
  bridgeFrame.setAttribute("aria-hidden", "true");

  bridgeReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Code Space dispatch bridge did not become ready.")), ACK_TIMEOUT_MS);
    bridgeFrame.addEventListener("load", () => {
      clearTimeout(timer);
      resolve(bridgeFrame);
    }, { once: true });
    bridgeFrame.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Code Space dispatch bridge could not be loaded."));
    }, { once: true });
  });

  document.body.appendChild(bridgeFrame);
  return bridgeReady;
}

async function sendPackages(packageExports) {
  const frame = await ensureBridgeFrame();
  const target = frame?.contentWindow;
  if (!target?.postMessage) throw new Error("Code Space dispatch bridge is unavailable. Keep Code Space running and try again.");

  const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ack = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAcks.delete(requestId);
      reject(new Error("Code Space did not acknowledge the Office dispatch. Keep the existing Code Space tab open and try again."));
    }, ACK_TIMEOUT_MS);
    pendingAcks.set(requestId, { resolve, reject, timer });
  });

  target.postMessage({
    type: "office-dispatch-submit-v1",
    requestId,
    packages: packageExports
  }, CODE_SPACE_ORIGIN);

  return ack;
}

export const codeSpaceConnector = Object.freeze({
  available: true,
  url: CODE_SPACE_URL,
  // Retained for compatibility with older callers. It no longer opens or
  // navigates a browser tab; dispatch uses the hidden bridge instead.
  reserve() {
    ensureBridgeFrame().catch((error) => console.error("Could not prepare Code Space dispatch bridge:", error));
    return true;
  },
  async dispatch(packageExport) {
    if (!packageExport || packageExport.format !== "office-dispatch-package" || packageExport.packageStatus !== "Ready") {
      throw new Error("Only a Ready Office dispatch package can be sent to Code Space.");
    }
    await sendPackages([packageExport]);
    return { sent: true, packageId: packageExport.packageId };
  },
  async dispatchMany(packageExports) {
    if (!Array.isArray(packageExports) || packageExports.length < 2 || packageExports.length > 10
      || packageExports.some((item) => item?.format !== "office-dispatch-package" || item?.packageStatus !== "Ready")) {
      throw new Error("Only 2 to 10 Ready Office dispatch packages can be sent as a batch.");
    }
    await sendPackages(packageExports);
    return { sent: true, packageIds: packageExports.map((item) => item.packageId) };
  },
});

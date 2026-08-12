const CODE_SPACE_URL = "http://127.0.0.1:8090/";
const CODE_SPACE_ORIGIN = new URL(CODE_SPACE_URL).origin;
const CODE_SPACE_WINDOW_NAME = "code-space";
let reservedWindow = null;

function isUsableWindow(target) {
  try {
    return Boolean(target && !target.closed);
  } catch {
    return false;
  }
}

function encodePackage(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export const codeSpaceConnector = Object.freeze({
  available: true,
  url: CODE_SPACE_URL,
  reserve() {
    if (isUsableWindow(reservedWindow)) {
      reservedWindow.focus?.();
      return reservedWindow;
    }

    // A named navigation reuses the existing Code Space browsing context when
    // the browser can target it. Supplying the real URL avoids a transient
    // about:blank tab when no such context exists yet.
    reservedWindow = window.open(CODE_SPACE_URL, CODE_SPACE_WINDOW_NAME);
    reservedWindow?.focus?.();
    return reservedWindow;
  },
  async dispatch(packageExport, targetWindow = null) {
    if (!packageExport || packageExport.format !== "office-dispatch-package" || packageExport.packageStatus !== "Ready") {
      throw new Error("Only a Ready Office dispatch package can be sent to Code Space.");
    }

    const payload = encodePackage(packageExport);
    const url = `${CODE_SPACE_URL}?officeDispatch=${encodeURIComponent(payload)}`;
    const target = isUsableWindow(targetWindow)
      ? targetWindow
      : isUsableWindow(reservedWindow)
        ? reservedWindow
        : null;
    if (!target) throw new Error("Code Space could not be reserved. Allow the Office pop-up and try again.");
    target.location = url;
    target.focus?.();
    return { sent: true, packageId: packageExport.packageId };
  },
  async dispatchMany(packageExports, targetWindow = null) {
    if (!Array.isArray(packageExports) || packageExports.length < 2 || packageExports.length > 10
      || packageExports.some((item) => item?.format !== "office-dispatch-package" || item?.packageStatus !== "Ready")) {
      throw new Error("Only 2 to 10 Ready Office dispatch packages can be sent as a batch.");
    }
    const target = isUsableWindow(targetWindow)
      ? targetWindow
      : isUsableWindow(reservedWindow)
        ? reservedWindow
        : null;
    if (!target?.postMessage) throw new Error("Code Space could not receive the batch. Keep the existing Code Space tab open and try again.");
    target.postMessage({ type: "office-dispatch-batch-v1", packages: packageExports }, CODE_SPACE_ORIGIN);
    target.focus?.();
    return { sent: true, packageIds: packageExports.map((item) => item.packageId) };
  },
});

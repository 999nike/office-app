const CODE_SPACE_URL = "http://127.0.0.1:8090/";

function encodePackage(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export const codeSpaceConnector = Object.freeze({
  available: true,
  url: CODE_SPACE_URL,
  open() {
    return window.open(CODE_SPACE_URL, "code-space");
  },
  async dispatch(packageExport, targetWindow = null) {
    if (!packageExport || packageExport.format !== "office-dispatch-package" || packageExport.packageStatus !== "Ready") {
      throw new Error("Only a Ready Office dispatch package can be sent to Code Space.");
    }

    const payload = encodePackage(packageExport);
    const url = `${CODE_SPACE_URL}?officeDispatch=${encodeURIComponent(payload)}`;
    const target = targetWindow && !targetWindow.closed ? targetWindow : window.open(CODE_SPACE_URL, "code-space");
    if (!target) throw new Error("Code Space could not be opened. Allow the Office pop-up and try again.");
    target.location.replace(url);
    target.focus?.();
    return { sent: true, packageId: packageExport.packageId };
  },
});

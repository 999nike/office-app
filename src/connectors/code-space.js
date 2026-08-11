/**
 * Future execution boundary for Code Space.
 * Office V0 deliberately has no network or filesystem integration.
 */
export const codeSpaceConnector = Object.freeze({
  available: false,
  async dispatch() {
    throw new Error("Code Space integration is not available in Office V0.");
  },
});

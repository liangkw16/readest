/**
 * Compatibility hook retained for dictionary-store call sites.
 * Account replica transport is retired; settings persist locally through the
 * normal settings store and user-owned file sync handles supported book data.
 */
export const markExplicitProviderOrderPublish = (): void => {};

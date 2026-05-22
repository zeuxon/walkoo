export const generateId = (): string => {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
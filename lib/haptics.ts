// Safe wrappers: do nothing outside Telegram or on old clients.
// Call only from event handlers (they touch `window`).
export const haptic = {
  light() {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
  },
  select() {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  },
};

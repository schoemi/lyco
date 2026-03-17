/**
 * Dispatches a custom "streak-updated" event on the window object.
 * The AppHeader listens for this event to re-fetch the streak value.
 * Call this after a successful session creation POST.
 */
export function dispatchStreakUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("streak-updated"));
  }
}

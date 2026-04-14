/**
 * Web Bluetooth Enhancement utility for Lyco Stage.
 * Provides feature detection for the Web Bluetooth API.
 * When available (Android), an optional direct BLE connection can be offered.
 * When not available, the stage falls back exclusively to HID keyboard events — without error message.
 */

export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

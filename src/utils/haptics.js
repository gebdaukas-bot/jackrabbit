// A short tap of feedback when a hole is confirmed: the taptic engine in the iOS
// app, a vibration where the browser supports it, nothing otherwise.
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isNative } from "../firebase";

export function confirmTap() {
  try {
    if (isNative) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    else navigator.vibrate?.(15);
  } catch {}
}

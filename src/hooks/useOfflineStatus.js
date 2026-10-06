import { useEffect, useState } from "react";
import { subscribe } from "../offline.js";

/** Re-render whenever offline download status / install availability changes.
 *  Read the actual values with getState() / canPromptInstall() from offline.js. */
export default function useOfflineStatus() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}

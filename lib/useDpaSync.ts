"use client"

import { useEffect, useRef } from "react"

const CHANNEL_NAME = "pactiva-dpa-acceptance"

// Keeps the DPA checkbox on /register and the one at the bottom of /dpa in sync while
// both tabs are open. Nothing is persisted, so the box is never pre-checked on a fresh
// visit. The registration form is the source of truth; the /dpa tab asks it for the
// current state on load.
export function useDpaSync(
  accepted: boolean,
  setAccepted: (value: boolean) => void,
  role: "form" | "viewer"
) {
  const acceptedRef = useRef(accepted)
  acceptedRef.current = accepted
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (e) => {
      if (e.data?.type === "state") setAccepted(!!e.data.value)
      else if (e.data?.type === "request" && role === "form") {
        channel.postMessage({ type: "state", value: acceptedRef.current })
      }
    }
    if (role === "viewer") channel.postMessage({ type: "request" })

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [role, setAccepted])

  return (value: boolean) => {
    setAccepted(value)
    channelRef.current?.postMessage({ type: "state", value })
  }
}

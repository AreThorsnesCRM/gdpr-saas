import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#FEF3E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 96,
            height: 116,
            border: "5px solid #7A4010",
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "14px 0",
          }}
        >
          <div style={{ width: 48, height: 10, background: "#C4831A", borderRadius: 6 }} />
          <div style={{ width: 48, height: 10, background: "#C4831A", borderRadius: 6 }} />
          <div style={{ width: 48, height: 10, background: "#C4831A", borderRadius: 6 }} />
        </div>
      </div>
    ),
    { ...size }
  )
}

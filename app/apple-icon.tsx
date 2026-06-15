import { ImageResponse } from "next/og"

export const runtime = "edge"
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
        }}
      >
        <svg width="120" height="120" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="2" width="40" height="50" rx="4" stroke="#7A4010" strokeWidth="2.2" fill="none" />
          <line x1="7" y1="19" x2="47" y2="19" stroke="#7A4010" strokeWidth="0.8" opacity="0.3" />
          <line x1="7" y1="36" x2="47" y2="36" stroke="#7A4010" strokeWidth="0.8" opacity="0.3" />
          <rect x="19" y="8.5" width="16" height="3.5" rx="1.75" fill="#C4831A" />
          <rect x="19" y="25.5" width="16" height="3.5" rx="1.75" fill="#C4831A" />
          <rect x="19" y="42" width="16" height="3.5" rx="1.75" fill="#C4831A" />
        </svg>
      </div>
    ),
    { ...size }
  )
}

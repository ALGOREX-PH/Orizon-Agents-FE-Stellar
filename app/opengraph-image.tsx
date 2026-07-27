import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Orizon Agents — Pay-per-workflow agent commerce on Stellar";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A0014",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 160,
            height: 80,
            borderTopLeftRadius: 160,
            borderTopRightRadius: 160,
            background: "linear-gradient(180deg, #FF2E9A 0%, #B026FF 100%)",
          }}
        />
        <div
          style={{
            width: 280,
            height: 8,
            marginTop: 12,
            backgroundColor: "#00FFD1",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "0.25em",
          color: "#F5F3FF",
        }}
      >
        <span>ORIZON</span>
        <span style={{ color: "#00FFD1" }}>_</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 30,
          letterSpacing: "0.6em",
          color: "#A79FC7",
        }}
      >
        AGENTS
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 44,
          fontSize: 26,
          letterSpacing: "0.08em",
          color: "#B026FF",
        }}
      >
        Pay-per-workflow agent commerce on Stellar
      </div>
    </div>,
    { ...size },
  );
}

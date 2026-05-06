"use client";

type Props = {
  onEnter: () => void;
};

export default function Dedication({ onEnter }: Props) {
  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label="Bahçeyi aç"
      style={{
        border: 0,
        margin: 0,
        padding: "0 24px",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        color: "white",
        cursor: "pointer",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            fontSize: 26,
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Beyza için.
        </p>
        <p
          style={{
            fontSize: 17,
            opacity: 0.85,
            margin: "16px 0 0",
            lineHeight: 1.6,
          }}
        >
          Sana küçük bir bahçe yaptım.
        </p>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            opacity: 0.55,
            margin: "48px 0 0",
          }}
        >
          açmak için dokun
        </p>
      </div>
    </button>
  );
}

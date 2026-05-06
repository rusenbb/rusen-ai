"use client";

type Props = {
  onEnter: () => void;
};

export default function Dedication({ onEnter }: Props) {
  return (
    <button
      type="button"
      onClick={onEnter}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "#0a0a0f",
        color: "white",
        fontFamily: "var(--font-geist-sans)",
        textAlign: "center",
        padding: "0 24px",
      }}
      aria-label="Bahçeyi aç"
    >
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Beyza için.
        </p>
        <p
          style={{
            fontSize: 16,
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

interface ControlPanelProps {
    onRandomize: () => void;
    onGenerateRGB: () => void;
    onGenerateIR: () => void;
    onGenerateDataset: () => void;
    isUsingFallback?: boolean;
}

export default function ControlPanel({
    onRandomize,
    onGenerateRGB,
    onGenerateIR,
    onGenerateDataset,
    isUsingFallback = false,
}: ControlPanelProps) {
    const buttonStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        marginBottom: "8px",
        background: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
        transition: "background 0.2s",
    };

    return (
        <div
            style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 280,
                padding: 20,
                background: "rgba(20, 20, 25, 0.95)",
                color: "white",
                borderRadius: 12,
                fontFamily: "system-ui, -apple-system, sans-serif",
                zIndex: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
        >
            <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 20 }}>SynGen Polygon</h2>

            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
                Synthetic Data Generation Platform
            </p>

            <hr style={{ borderColor: "rgba(255,255,255,0.1)", marginBottom: 16 }} />

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "#888", marginTop: 0 }}>
                Scene Controls
            </h3>

            <button style={buttonStyle} onClick={onRandomize}>
                🎲 Randomize Scene
            </button>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "#888", marginTop: 16 }}>
                Image Generation
            </h3>

            <button style={{ ...buttonStyle, background: "#10b981" }} onClick={onGenerateRGB}>
                📷 Generate RGB
            </button>

            <button style={{ ...buttonStyle, background: "#8b5cf6" }} onClick={onGenerateIR}>
                🔥 Generate IR
            </button>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "#888", marginTop: 16 }}>
                Dataset
            </h3>

            <button style={{ ...buttonStyle, background: "#f59e0b" }} onClick={onGenerateDataset}>
                📦 Generate Dataset
            </button>

            <div style={{ marginTop: 20, fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                <p><strong>Model:</strong> {isUsingFallback ? "Fallback Object (cube)" : "object.glb"}</p>
                <p><strong>Renderer:</strong> Three.js / R3F</p>
                <p><strong>Mode:</strong> Synthetic Generation</p>
            </div>
        </div>
    );
}

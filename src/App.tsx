import { useState } from "react";

import SceneViewer from "./components/SceneViewer";
import ControlPanel from "./components/ControlPanel";

function App() {
  const [randomize, setRandomize] = useState(0);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const handleRandomize = () => {
    setRandomize((value) => value + 1);
  };

  const handleGenerateRGB = () => {
    if (!canvas) {
      alert("3D canvas is not ready.");
      return;
    }

    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `rgb_scene_${Date.now()}.png`;
    link.href = image;
    link.click();
  };

  const handleGenerateIR = () => {
    console.log("Generate IR clicked");
  };

  const handleGenerateDataset = () => {
    console.log("Generate Dataset clicked");
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isUsingFallback && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            padding: "10px 16px",
            background: "rgba(220, 38, 38, 0.9)",
            color: "#ffffff",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <span>3D model not found — displaying fallback object.</span>
        </div>
      )}

      <SceneViewer
        randomize={randomize}
        onCanvasReady={setCanvas}
        onModelError={() => setIsUsingFallback(true)}
      />

      <ControlPanel
        onRandomize={handleRandomize}
        onGenerateRGB={handleGenerateRGB}
        onGenerateIR={handleGenerateIR}
        onGenerateDataset={handleGenerateDataset}
        isUsingFallback={isUsingFallback}
      />
    </div>
  );
}

export default App;
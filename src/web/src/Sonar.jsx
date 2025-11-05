import React, { useState, useRef } from "react";
import {
  Upload, LogOut, Loader2, Radio,
  Fish, Ship, Mountain, AlertCircle, User, Plane, Waves, History, Home
} from "lucide-react";

const Navbar = ({ onLogout }) => (
  <nav
    style={{
      background: "rgba(15,23,42,0.95)",
      borderBottom: "1px solid rgba(96,165,250,0.3)",
      backdropFilter: "blur(10px)",
      padding: "0.75rem 2rem",
    }}
  >
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Radio size={26} color="#60a5fa" />
        <h1 style={{ color: "#fff", fontSize: "1.35rem", fontWeight: "700" }}>
          SONAR AI
        </h1>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          style={{
            padding: "0.65rem 1.3rem",
            background: "rgba(96,165,250,0.15)",
            color: "#60a5fa",
            border: "1px solid rgba(96,165,250,0.4)",
            borderRadius: "0.6rem",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "500",
          }}
        >
          <Home size={18} style={{ marginRight: "0.5rem" }} />
          Dashboard
        </button>

        <button
          style={{
            padding: "0.65rem 1.3rem",
            background: "rgba(96,165,250,0.15)",
            color: "#60a5fa",
            border: "1px solid rgba(96,165,250,0.4)",
            borderRadius: "0.6rem",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "500",
          }}
        >
          <History size={18} style={{ marginRight: "0.5rem" }} />
          History
        </button>

        <button
          onClick={onLogout}
          style={{
            padding: "0.65rem 1.3rem",
            background: "rgba(239,68,68,0.15)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "0.6rem",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "500",
          }}
        >
          <LogOut size={18} style={{ marginRight: "0.5rem" }} />
          Logout
        </button>
      </div>
    </div>
  </nav>
);

const UploadPage = ({ onImageProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const uploadImageToBackend = async (file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", file.name);
      const r = await fetch("http://localhost:3001/upload", { method: "POST", body: formData });
      if (!r.ok) throw new Error("Upload failed");
      return await r.json();
    } catch (err) {
      setUploadError(`Error: ${err.message}`);
      return null;
    }
  };

  const processImage = async (file, url) => {
    setIsProcessing(true);
    setUploadError("");
    const result = await uploadImageToBackend(file);
    if (!result) return setIsProcessing(false);

    const prediction = result.model_prediction;
    const probs = prediction.probabilities || {};
    const classes = Object.entries(probs).map(([cls, conf]) => ({
      category: cls.charAt(0).toUpperCase() + cls.slice(1),
      confidence: Math.round(conf * 100),
      icon:
        {
          ship: <Ship size={18} />,
          mine: <AlertCircle size={18} />,
          fish: <Fish size={18} />,
          seafloor: <Mountain size={18} />,
          plane: <Plane size={18} />,
          human: <User size={18} />,
        }[cls] || <Waves size={18} />,
    }));
    const topClass = prediction.predicted_class || classes.sort((a, b) => b.confidence - a.confidence)[0]?.category;
    onImageProcessed({
      original: url,
      filename: file.name,
      aiDescription: `AI detected a ${topClass} with ${
        prediction.confidence_percent?.toFixed(2) || classes[0]?.confidence
      }% confidence.`,
      classifications: classes.sort((a, b) => b.confidence - a.confidence),
    });
    setIsProcessing(false);
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        processImage(file, e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelect(f);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      style={{
        border: `2px dashed ${isDragging ? "#60a5fa" : "rgba(96,165,250,0.3)"}`,
        borderRadius: "1rem",
        background: "rgba(15,23,42,0.8)",
        padding: "4rem 2rem",
        textAlign: "center",
        cursor: "pointer",
        minHeight: "500px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "0.3s",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files[0])}
        style={{ display: "none" }}
      />
      {!uploadedImage ? (
        <div>
          <Upload size={72} color="#60a5fa" style={{ marginBottom: "1.5rem" }} />
          <h3 style={{ color: "#fff", fontSize: "1.75rem", fontWeight: "600" }}>Upload SONAR Image</h3>
          <p style={{ color: "#94a3b8" }}>Click or drag and drop to analyze</p>
          {uploadError && <p style={{ color: "#ef4444" }}>{uploadError}</p>}
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", maxWidth: "700px" }}>
          <img
            src={uploadedImage}
            alt="preview"
            style={{ width: "100%", borderRadius: "0.75rem", border: "1px solid rgba(96,165,250,0.3)" }}
          />
          {isProcessing && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15,23,42,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.5rem",
                gap: "1rem",
              }}
            >
              <Loader2 size={48} color="#60a5fa" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ color: "#e2e8f0" }}>Analyzing image...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ResultsPage = ({ classificationResult, onNewAnalysis }) => {
  const downloadResults = () => {
    const blob = new Blob([JSON.stringify(classificationResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classificationResult.filename.replace(/\.[^/.]+$/, "")}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleExplain = () => alert("LIME / Grad-CAM visualization coming soon!");

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        background: "rgba(15,23,42,0.85)",
        borderRadius: "1rem",
        border: "1px solid rgba(96,165,250,0.2)",
        padding: "2rem",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {/* Left side: image and buttons */}
      <div style={{ flex: "1 1 60%", textAlign: "center" }}>
        <img
          src={classificationResult.original}
          alt="Analyzed"
          style={{
            width: "100%",
            maxWidth: "850px",
            borderRadius: "1rem",
            border: "1px solid rgba(96,165,250,0.3)",
            boxShadow: "0 0 40px rgba(59,130,246,0.3)",
          }}
        />
        <p style={{ color: "#e2e8f0", fontSize: "1.25rem", marginTop: "1.5rem" }}>
          {classificationResult.aiDescription}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <button
            onClick={downloadResults}
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Download JSON Report
          </button>
          <button
            onClick={handleExplain}
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(147,51,234,0.3)",
              background: "rgba(147,51,234,0.2)",
              color: "#c084fc",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            LIME / Grad-CAM Analysis
          </button>
          <button
            onClick={onNewAnalysis}
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(148,163,184,0.3)",
              background: "rgba(148,163,184,0.15)",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            New Analysis
          </button>
        </div>
      </div>

      <div style={{ flex: "1 1 30%", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "stretch" }}>
        {classificationResult.classifications.map((c, i) => (
          <div
            key={i}
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.3))",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: "0.8rem",
              padding: "1.1rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#e2e8f0",
              boxShadow: "0 0 20px rgba(59,130,246,0.4)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "1rem" }}>
              {c.icon} {c.category}
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#60a5fa" }}>{c.confidence}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const SonarApp = () => {
  const [page, setPage] = useState("upload");
  const [result, setResult] = useState(null);

  const handleLogout = () => window.location.reload();
  const handleProcessed = (r) => {
    setResult(r);
    setPage("results");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
        fontFamily: "Inter,sans-serif",
      }}
    >
      <Navbar onLogout={handleLogout} />
      <main style={{ padding: "2.5rem", maxWidth: "1400px", margin: "0 auto" }}>
        {page === "upload" && <UploadPage onImageProcessed={handleProcessed} />}
        {page === "results" && <ResultsPage classificationResult={result} onNewAnalysis={() => setPage("upload")} />}
      </main>

      <style>{`
        @keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
      `}</style>
    </div>
  );
};

export default SonarApp;

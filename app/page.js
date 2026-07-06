"use client";

import { useState } from "react";

export default function Home() {
  const [videoFile, setVideoFile] = useState(null);
  const [coverTime, setCoverTime] = useState(-0.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadLink, setDownloadLink] = useState("");

  const handleVideoChange = (e) => {
    setVideoFile(e.target.files[0]);
    setError("");
    setDownloadLink("");
  };

  const handleConvert = async () => {
    if (!videoFile) {
      setError("Pilih video dulu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("coverTime", coverTime);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>Motion Photo Converter</h1>

      <div className="card">
        <label>
          Pilih video:
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            disabled={loading}
          />
        </label>
        {videoFile && <p>✓ {videoFile.name}</p>}
      </div>

      <div className="card">
        <label>
          Cover time (detik):
          <input
            type="range"
            min="-0.5"
            max="2"
            step="0.1"
            value={coverTime}
            onChange={(e) => setCoverTime(parseFloat(e.target.value))}
            disabled={loading}
          />
          <span>{coverTime.toFixed(1)}s</span>
        </label>
        <small>
          {coverTime < 0
            ? `Freeze di ${Math.abs(coverTime).toFixed(1)}s sebelum akhir`
            : `Cover dari ${coverTime.toFixed(1)}s awal`}
        </small>
      </div>

      <button onClick={handleConvert} disabled={loading || !videoFile}>
        {loading ? "Converting..." : "Convert"}
      </button>

      {error && <div className="error">{error}</div>}

      {downloadLink && (
        <div className="success">
          <p>✓ Convert berhasil!</p>
          <a href={downloadLink} download={`motion_photo_${Date.now()}.jpg`}>
            Download
          </a>
        </div>
      )}
    </main>
  );
}

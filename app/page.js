"use client";

// [INIT]: Import React hooks yang dibutuhkan
import { useState, useRef, useEffect } from "react";

export default function Home() {
  // [STATE]: Core states untuk file, waktu, dan status konversi
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [coverTime, setCoverTime] = useState(-0.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadLink, setDownloadLink] = useState("");

  // [INIT]: Ref untuk mengontrol video player secara langsung
  const videoRef = useRef(null);

  // [HANDLER]: Mengatur pergantian file video dan reset state lama
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setError("");
    setDownloadLink("");
    setCoverTime(-0.1);
  };

  // [UTIL]: Sinkronisasi frame video player ketika nilai slider berubah
  useEffect(() => {
    if (!videoRef.current || !videoDuration) return;

    if (coverTime < 0) {
      const targetTime = videoDuration + coverTime;
      videoRef.current.currentTime = Math.max(0, targetTime);
    } else {
      videoRef.current.currentTime = Math.min(coverTime, videoDuration);
    }
  }, [coverTime, videoDuration]);

  // [HANDLER]: Mengirim data video ke server-side API untuk diconvert
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

  // [RENDER]: Komponen UI utama dengan arsitektur Bento Grid Tailwind v4
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ffffff] flex flex-col items-center justify-center p-4 sm:p-8 selection:bg-white selection:text-black">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Header Section */}
        <header className="text-center sm:text-left mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Motion Photo Converter
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Convert your video clips into dynamic live motion photos seamlessly.
          </p>
        </header>

        {/* TOP SECTION: Dynamic Split Grid Container */}
        <section
          className={`grid gap-4 transition-all duration-500 ease-in-out ${videoFile ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Box Input - Optimized to min-h-65 */}
          <div className="relative bg-[#161616] border border-[#262626] rounded-2xl p-8 flex flex-col items-center justify-center min-h-65 text-center transition-all group hover:border-[#404040]">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center border border-[#404040] group-hover:scale-105 transition-transform duration-300">
                <span className="text-xl font-light text-[#a3a3a3]">
                  {videoFile ? "↺" : "+"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#e5e5e5]">
                  {videoFile
                    ? "Want to change the video?"
                    : "Click or drag video file"}
                </p>
                <p className="text-xs text-[#737373] mt-1">
                  {videoFile
                    ? `Current: ${videoFile.name}`
                    : "Supports MP4, MOV, or WebM clips"}
                </p>
              </div>
            </div>
          </div>

          {/* Box Preview - Optimized to min-h-65 & max-h-57.5 */}
          {videoFile && (
            <div className="bg-[#161616] border border-[#262626] rounded-2xl p-4 flex flex-col items-center justify-center min-h-65 animate-fade-in">
              <div className="relative w-full h-full max-h-57.5 rounded-xl overflow-hidden bg-[#0d0d0d] flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoPreviewUrl}
                  preload="metadata"
                  onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider text-[#a3a3a3] border border-[#262626]">
                  Live Preview
                </div>
              </div>
            </div>
          )}
        </section>

        {/* BOTTOM SECTION: Controls */}
        <section className="bg-[#161616] border border-[#262626] rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-[#a3a3a3]">
                Cover Time Offset
              </label>
              <span className="text-sm font-mono bg-[#262626] px-2 py-0.5 rounded text-white border border-[#404040]">
                {coverTime >= 0
                  ? `+${coverTime.toFixed(1)}s`
                  : `${coverTime.toFixed(1)}s`}
              </span>
            </div>

            <input
              type="range"
              min="-1.5"
              max={videoDuration > 0 ? Math.min(videoDuration, 3) : 3}
              step="0.1"
              value={coverTime}
              onChange={(e) => setCoverTime(parseFloat(e.target.value))}
              disabled={loading || !videoFile}
              className="custom-slider w-full accent-white disabled:opacity-30 disabled:cursor-not-allowed"
            />

            <div className="text-xs text-[#737373] font-medium">
              {!videoFile ? (
                <span>Upload a video to calibrate freezing frame time.</span>
              ) : coverTime < 0 ? (
                <span>
                  Freeze snapshot will be taken{" "}
                  <span className="text-[#e5e5e5] font-mono">
                    {Math.abs(coverTime).toFixed(1)}s
                  </span>{" "}
                  before the video ends.
                </span>
              ) : (
                <span>
                  Freeze snapshot will be taken{" "}
                  <span className="text-[#e5e5e5] font-mono">
                    {coverTime.toFixed(1)}s
                  </span>{" "}
                  from the beginning.
                </span>
              )}
            </div>
          </div>

          {/* Action Button Area - Optimized to flex-2 */}
          <div className="flex flex-col gap-2 mt-2">
            {downloadLink ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => {
                    setDownloadLink("");
                    setVideoFile(null);
                    setVideoPreviewUrl("");
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#262626] bg-[#262626] hover:bg-[#404040] text-sm font-medium transition-colors text-center"
                >
                  Convert Another Video
                </button>
                <a
                  href={downloadLink}
                  download={`motion_photo_${Date.now()}.jpg`}
                  className="flex-2 py-3 px-4 rounded-xl bg-[#ffffff] text-[#000000] hover:bg-[#e5e5e5] text-sm font-semibold transition-colors text-center shadow-lg shadow-white/5"
                >
                  Download Motion Photo ↓
                </a>
              </div>
            ) : (
              <button
                onClick={handleConvert}
                disabled={loading || !videoFile}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-[0.99] bg-[#ffffff] text-[#000000] hover:bg-[#e5e5e5] disabled:bg-[#1f1f1f] disabled:text-[#525252] disabled:border disabled:border-[#262626] disabled:scale-100 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-[#525252]"
                      xmlns="http://www.w3.org/2000/02/22-rdf-syntax-ns#"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing on Server...</span>
                  </div>
                ) : (
                  "Convert to Motion Photo"
                )}
              </button>
            )}

            {error && (
              <div className="mt-2 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-medium animate-shake">
                ⚠️ Error: {error}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

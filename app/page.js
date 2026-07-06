"use client";

// [INIT]: Import React hooks yang dibutuhkan
import { useState, useRef, useEffect } from "react";

export default function Home() {
  // [STATE]: Core states untuk manajemen file video dan status konversi
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadLink, setDownloadLink] = useState("");

  // [STATE]: State untuk mendeteksi orientasi rasio aspek video (Portrait/Landscape)
  const [isPortrait, setIsPortrait] = useState(false);

  // [STATE]: State slider absolut untuk timeline detik video
  const [sliderValue, setSliderValue] = useState(0);

  // [STATE]: State interaktif untuk mendeteksi file drag-over di atas dropzone
  const [isDragging, setIsDragging] = useState(false);

  // [INIT]: Ref untuk mengontrol pemutaran dan frame video player secara langsung
  const videoRef = useRef(null);

  // [HANDLER]: Mengolah file video dari input konvensional maupun event drag-and-drop
  const processVideoFile = (file) => {
    if (!file) return;

    // [UTIL]: Revoke URL lama untuk menghindari kebocoran memori (memory leak)
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setError("");
    setDownloadLink("");
    setSliderValue(0);
    setIsPortrait(false);
  };

  // [HANDLER]: Mengatur pergantian file video via input klik biasa
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    processVideoFile(file);
  };

  // [HANDLER]: Mengaktifkan glow state saat file diseret masuk ke area input
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // [HANDLER]: Menghapus glow state saat file diseret keluar dari area input
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // [HANDLER]: Memproses file langsung saat dilepas (drop) di area input
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      processVideoFile(file);
    } else {
      setError("Format file harus berupa video!");
    }
  };

  // [HANDLER]: Deteksi metadata video player untuk durasi, rasio aspek, dan posisi default slider
  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    const duration = videoEl.duration;
    setVideoDuration(duration);

    // [STATE]: Set bendera portrait jika tinggi video melebihi lebarnya
    setIsPortrait(videoEl.videoHeight > videoEl.videoWidth);

    // [STATE]: Inisialisasi slider otomatis di 0.1 detik menjelang akhir video
    setSliderValue(Math.max(0, duration - 0.1));
  };

  // [UTIL]: Sinkronisasi real-time frame video player mengikuti pergeseran slider timeline
  useEffect(() => {
    if (!videoRef.current || !videoDuration) return;
    videoRef.current.currentTime = sliderValue;
  }, [sliderValue, videoDuration]);

  // [CALC]: Kalkulasi badge teks dan deskripsi kalkulatif untuk payload API backend
  const distanceFromEnd = videoDuration - sliderValue;
  let displayBadge = "";
  let descriptionText = "";
  let computedCoverTime = 0;

  // [VALIDATE]: Kondisional penyusunan teks informasi timeline slider
  if (sliderValue === 0) {
    displayBadge = "Start";
    descriptionText =
      "Freeze snapshot will be taken from the beginning of the video.";
    computedCoverTime = 0;
  } else if (videoDuration > 0 && sliderValue >= videoDuration) {
    displayBadge = "End";
    descriptionText =
      "Freeze snapshot will be taken from the end of the video.";
    computedCoverTime = -0.001;
  } else if (videoDuration > 0 && sliderValue > videoDuration / 2) {
    displayBadge = `-${distanceFromEnd.toFixed(1)}s`;
    descriptionText = `Freeze snapshot will be taken ${distanceFromEnd.toFixed(1)}s before the video ends.`;
    computedCoverTime = -parseFloat(distanceFromEnd.toFixed(1));
  } else {
    displayBadge = `+${sliderValue.toFixed(1)}s`;
    descriptionText = `Freeze snapshot will be taken ${sliderValue.toFixed(1)}s from the beginning.`;
    computedCoverTime = parseFloat(sliderValue.toFixed(1));
  }

  // [FETCH]: Mengirimkan payload multipart-form data ke endpoint API konversi biner
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
      formData.append("coverTime", computedCoverTime);

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

  // [RENDER]: Komponen antarmuka (UI) bento grid dengan structural utility classes
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

        {/* TOP SECTION: Adaptive Grid (Menggunakan items-stretch untuk menjamin tinggi simetris sempurna) */}
        <section
          className={`grid gap-4 items-stretch transition-all duration-500 ease-in-out ${videoFile ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Box Input Dropzone: Garis border dikunci di base class agar tidak hilang saat transisi state */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border rounded-2xl p-8 flex flex-col items-center justify-center min-h-65 text-center transition-all duration-300 group ${
              videoFile ? "hidden md:flex" : "flex"
            } ${
              isDragging
                ? "border-neutral-400 bg-[#1a1a1a] shadow-[0_0_30px_rgba(255,255,255,0.08)] scale-[1.01]"
                : "border-[#262626] bg-[#161616] hover:border-neutral-400 hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]"
            }`}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              {/* [STYLE]: Icon bulat bertransisi dinamis mengikuti status upload / seret file */}
              <div
                className={`w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center border transition-all duration-300 ${
                  isDragging
                    ? "scale-110 border-neutral-400 bg-[#333333]"
                    : "border-[#404040] group-hover:scale-105"
                }`}
              >
                <span className="text-xl font-light text-[#a3a3a3]">
                  {videoFile ? "↺" : "+"}
                </span>
              </div>
              {/* [FORMAT]: Teks instruksi dinamis untuk UI yang interaktif */}
              <div className="px-4">
                <p className="text-sm font-medium text-[#e5e5e5]">
                  {videoFile
                    ? "Want to change the video?"
                    : "Click or drag video file"}
                </p>
                <p className="text-xs text-[#737373] mt-1.5 truncate max-w[260px] font-mono">
                  {videoFile
                    ? `Current: ${videoFile.name}`
                    : "Supports MP4, MOV, or WebM clips"}
                </p>
              </div>
            </div>
          </div>

          {/* Box Preview Zone: Orientasi adaptif terhadap dimensi video */}
          {videoFile && (
            <div
              className={`relative bg-[#161616] border border-[#262626] rounded-2xl p-4 flex flex-col items-center justify-center animate-fade-in w-full overflow-hidden ${isPortrait ? "h-auto" : "min-h-65"}`}
            >
              <div
                className={`relative w-full rounded-xl overflow-hidden bg-[#0d0d0d] flex items-center justify-center ${isPortrait ? "h-auto max-h-112" : "max-h-57.5 h-57.5"}`}
              >
                <video
                  ref={videoRef}
                  src={videoPreviewUrl}
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  className={`w-full object-contain ${isPortrait ? "h-auto max-h-108" : "h-full"}`}
                  muted
                  playsInline
                />

                {/* Mobile Floating Overlay Bar: Otomatis aktif menggantikan area dropzone utama di perangkat mobile */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to from-black/95 via-black/60 to-transparent p-4 flex items-center justify-between gap-3 md:hidden z-20">
                  <p className="text-xs text-[#d4d4d4] truncate max-w-[55%] font-mono">
                    {videoFile.name}
                  </p>
                  <div className="relative overflow-hidden bg-[#262626] active:bg-[#333333] border border-[#404040] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 active:scale-95 duration-150 shadow-md">
                    <span>Change Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      disabled={loading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* BOTTOM SECTION: Control Panel Dashboard */}
        <section className="bg-[#161616] border border-[#262626] rounded-2xl p-6 flex flex-col gap-6">
          {/* Timeline Slider Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-[#a3a3a3]">
                Cover Time Offset
              </label>
              <span className="text-sm font-mono bg-[#262626] px-2 py-0.5 rounded text-white border border-[#404040]">
                {displayBadge}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={videoDuration || 10}
              step="0.1"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              disabled={loading || !videoFile}
              className="custom-slider w-full accent-white disabled:opacity-30 disabled:cursor-not-allowed"
            />

            <div className="text-xs text-[#737373] font-medium transition-all duration-200">
              {!videoFile ? (
                <span>Upload a video to calibrate freezing frame time.</span>
              ) : (
                <span>{descriptionText}</span>
              )}
            </div>
          </div>

          {/* Action Trigger Buttons */}
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

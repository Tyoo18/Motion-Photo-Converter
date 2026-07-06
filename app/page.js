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
  const [isPortrait, setIsPortrait] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // [INIT]: Ref untuk mengontrol pemutaran dan frame video player secara langsung
  const videoRef = useRef(null);

  // [HANDLER]: Mengolah file video dari input konvensional maupun event drag-and-drop
  const processVideoFile = (file) => {
    if (!file) return;

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

  // [HANDLER]: Menangani perubahan file lewat file picker biasa
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    processVideoFile(file);
  };

  // [HANDLER]: Efek drag-over untuk indikasi dropzone aktif
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // [HANDLER]: Efek drag-leave saat file ditarik keluar dari dropzone
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // [HANDLER]: Menangani file video yang di-drop ke area dropzone
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

  // [HANDLER]: Setup konfigurasi durasi awal dan pencegahan glitch frame akhir saat metadata video termuat
  const handleLoadedMetadata = (e) => {
    const videoEl = e.target;
    const duration = parseFloat(videoEl.duration.toFixed(1));

    // [STATE]: Set durasi asli video ke state
    setVideoDuration(duration);
    // [STATE]: Cek dimensi aspek rasio video portrait/landscape
    setIsPortrait(videoEl.videoHeight > videoEl.videoWidth);
    // [STATE]: Set otomatis ke 0.1 detik sebelum video berakhir demi stabilitas browser native & API backend
    setSliderValue(parseFloat((duration - 0.1).toFixed(1)));
  };

  // [STATE]: Mengubah posisi video frame saat slider digeser oleh user
  useEffect(() => {
    if (!videoRef.current || !videoDuration) return;
    videoRef.current.currentTime = sliderValue;
  }, [sliderValue, videoDuration]);

  // [CALC]: Hitung batas aman maksimal slider kanan (0.1 detik sebelum video selesai)
  const maxSafeSliderValue = videoDuration
    ? parseFloat((videoDuration - 0.1).toFixed(1))
    : 0;
  const distanceFromEnd = videoDuration - sliderValue;

  let displayBadge = "";
  let descriptionText = "";
  let computedCoverTime = 0;

  const tolerance = 0.05;

  // [CALC]: Logic conditioning untuk memanipulasi teks visual (illusion of perfection)
  if (
    videoDuration > 0 &&
    Math.abs(sliderValue - maxSafeSliderValue) < tolerance
  ) {
    // [FORMAT]: Slider rata kanan mentok, tampilkan badge "End" dengan deskripsi clean (illusion of perfection)
    displayBadge = "End";
    descriptionText =
      "Freeze snapshot will be taken from the end of the video.";
    computedCoverTime = -0.1;
  } else if (sliderValue < tolerance && videoDuration > 0) {
    // [FORMAT]: Slider rata kiri mentok (awal video)
    displayBadge = "Start";
    descriptionText =
      "Freeze snapshot will be taken from the beginning of the video.";
    computedCoverTime = 0;
  } else if (videoDuration > 0) {
    // [FORMAT]: Slider berada di area tengah timeline video
    if (sliderValue > videoDuration / 2) {
      displayBadge = `-${distanceFromEnd.toFixed(1)}s`;
      descriptionText = `Freeze snapshot will be taken ${distanceFromEnd.toFixed(1)}s from the end.`;
      computedCoverTime = -parseFloat(distanceFromEnd.toFixed(1));
    } else {
      displayBadge = `+${sliderValue.toFixed(1)}s`;
      descriptionText = `Freeze snapshot will be taken ${sliderValue.toFixed(1)}s from the beginning.`;
      computedCoverTime = parseFloat(sliderValue.toFixed(1));
    }
  } else {
    // [FORMAT]: State default saat video belum di-upload
    displayBadge = "—";
    descriptionText = "Upload a video to calibrate freezing frame time.";
    computedCoverTime = 0;
  }

  // [FORMAT]: Jika konversi sudah selesai, timpa instruksi teks menjadi panduan pasca-konversi yang tegas
  if (downloadLink) {
    descriptionText = "Conversion complete!";
  }

  // [FETCH]: Kirim payload multipart form data ke server endpoint api
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ffffff] flex flex-col items-center justify-center p-4 sm:p-8 selection:bg-white selection:text-black">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <header className="text-center sm:text-left mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Motion Photo Converter
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Convert your video clips into dynamic live motion photos seamlessly.
          </p>
        </header>

        {/* [RENDER]: Preview area grid layout */}
        <section
          className={`grid gap-4 items-stretch transition-all duration-500 ease-in-out ${videoFile ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
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
              <div className="px-4">
                <p className="text-sm font-medium text-[#e5e5e5]">
                  {videoFile
                    ? "Want to change the video?"
                    : "Click or drag video file"}
                </p>
                <p className="text-xs text-[#737373] mt-1.5 truncate max-w-65 font-mono">
                  {videoFile
                    ? `Current: ${videoFile.name}`
                    : "Supports MP4, MOV, or WebM clips"}
                </p>
              </div>
            </div>
          </div>

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

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/60 to-transparent p-4 flex items-center justify-between gap-3 md:hidden z-20">
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

        {/* [RENDER]: Control panel & slider configuration */}
        <section className="bg-[#161616] border border-[#262626] rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-[#a3a3a3]">
                Cover Time Offset
              </label>
              <span className="text-sm font-mono bg-[#262626] px-2 py-0.5 rounded text-white border border-[#404040]">
                {displayBadge}
              </span>
            </div>

            {/* [STYLE]: Modifikasi slider rail track dan thumb dengan state disabled tambahan saat sukses konversi */}
            <div className="relative w-full py-2 flex items-center">
              <input
                type="range"
                min="0"
                max={videoDuration ? maxSafeSliderValue : 10}
                step="0.1"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                disabled={loading || !videoFile || !!downloadLink}
                className="w-full h-6 appearance-none bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none
                  [&::-webkit-slider-runnable-track]:bg-[#212121] [&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:rounded-xl [&::-webkit-slider-runnable-track]:border [&::-webkit-slider-runnable-track]:border-[#2d2d2d]
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:mt-[-4] [&::-webkit-slider-thumb]:rounded-xl [&::-webkit-slider-thumb]:bg-[#ffffff] [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.6)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95 [&::-webkit-slider-thumb]:border-0
                  [&::-moz-range-track]:bg-[#212121] [&::-moz-range-track]:h-6 [&::-moz-range-track]:rounded-xl [&::-moz-range-track]:border [&::-moz-range-track]:border-[#2d2d2d]
                  [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:rounded-xl [&::-moz-range-thumb]:bg-[#ffffff] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.6)] [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-95"
              />
            </div>

            <div className="text-xs text-[#737373] font-medium transition-all duration-200 min-h-4">
              {descriptionText}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {downloadLink ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => {
                    setDownloadLink("");
                    setVideoFile(null);
                    setVideoPreviewUrl("");
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#262626] bg-[#262626] hover:bg-[#404040] text-sm font-medium transition-colors text-center cursor-pointer"
                >
                  Convert Another Video
                </button>

                <a
                  href={downloadLink}
                  download={`motion_photo_${Date.now()}.jpg`}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#ffffff] text-[#000000] hover:bg-[#e5e5e5] text-sm font-semibold transition-colors text-center shadow-lg shadow-white/5 cursor-pointer"
                >
                  Download Motion Photo ↓
                </a>
              </div>
            ) : (
              /* [RENDER]: Main convert button dengan integrasi pointer-events & active scale feedback */
              <button
                onClick={handleConvert}
                disabled={loading || !videoFile}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-[0.99] bg-[#ffffff] text-[#000000] hover:bg-[#e5e5e5] disabled:bg-[#1f1f1f] disabled:text-[#525252] disabled:border disabled:border-[#262626] disabled:scale-100 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-[#525252]"
                      xmlns="http://www.w3.org/2000/svg"
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

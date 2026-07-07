// app/api/convert/route.js
import { convertToMotionPhoto } from "@/lib/convertToMotionPhoto";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video");
    const coverTime = parseFloat(formData.get("coverTime") || "-0.1");

    if (!videoFile) {
      return Response.json({ error: "Video file required" }, { status: 400 });
    }

    // Simpan video ke temp file
    const buffer = await videoFile.arrayBuffer();
    const tempVideoPath = join(tmpdir(), `upload_${Date.now()}.mp4`);
    await writeFile(tempVideoPath, Buffer.from(buffer));

    // Proses convert
    const resultBuffer = await convertToMotionPhoto(tempVideoPath, coverTime);

    // Hapus video temp
    await unlink(tempVideoPath);

    // Return hasil sebagai file
    return new Response(resultBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="motion_photo_${Date.now()}.jpg"`,
      },
    });
  } catch (error) {
    console.error("Convert error:", error);
    return Response.json(
      { error: error.message || "Conversion failed" },
      { status: 500 },
    );
  }
}

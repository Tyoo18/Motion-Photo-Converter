// lib/convertToMotionPhoto.js
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");

function buildXMP(videoSizeBytes) {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"
        GCamera:MotionPhoto="1"
        GCamera:MotionPhotoVersion="1"
        GCamera:MotionPhotoPresentationTimestampUs="0">
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:Container="http://ns.google.com/photos/1.0/container/"
        xmlns:Item="http://ns.google.com/photos/1.0/container/item/">
      <Container:Directory>
        <rdf:Seq>
          <rdf:li rdf:parseType="Resource">
            <Container:Item Item:Mime="image/jpeg" Item:Semantic="Primary" Item:Length="0" Item:Padding="0"/>
          </rdf:li>
          <rdf:li rdf:parseType="Resource">
            <Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="${videoSizeBytes}" Item:Padding="0"/>
          </rdf:li>
        </rdf:Seq>
      </Container:Directory>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function insertXMPIntoJPEG(jpegBuffer, xmpString) {
  const XMP_HEADER = Buffer.from("http://ns.adobe.com/xap/1.0/\0", "ascii");
  const xmpPayload = Buffer.concat([
    XMP_HEADER,
    Buffer.from(xmpString, "utf8"),
  ]);

  const segmentLength = xmpPayload.length + 2;
  const app1Marker = Buffer.from([
    0xff,
    0xe1,
    (segmentLength >> 8) & 0xff,
    segmentLength & 0xff,
  ]);
  const app1Segment = Buffer.concat([app1Marker, xmpPayload]);

  const soi = jpegBuffer.subarray(0, 2);
  const rest = jpegBuffer.subarray(2);

  return Buffer.concat([soi, app1Segment, rest]);
}

async function convertToMotionPhoto(videoPath, coverTime = -0.1) {
  const tempDir = os.tmpdir();
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const coverPath = path.join(tempDir, `cover_${baseName}_${Date.now()}.jpg`);
  const resizedPath = path.join(
    tempDir,
    `boosted_${baseName}_${Date.now()}.mp4`,
  );

  try {
    // [1] boost bitrate video
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          "-c:v",
          "libx264",
          "-profile:v",
          "high",
          "-level",
          "4.1",
          "-b:v",
          "12M",
          "-maxrate",
          "15M",
          "-bufsize",
          "20M",
        ])
        .output(resizedPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // [2] extract cover
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(resizedPath);

      if (coverTime >= 0) {
        cmd.inputOptions(["-ss", String(coverTime)]);
      } else {
        cmd.inputOptions(["-sseof", String(coverTime)]);
      }

      cmd
        .outputOptions([
          "-vframes",
          "1",
          "-vf",
          "scale=in_range=limited:out_range=full",
        ])
        .output(coverPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const videoBytes = fs.readFileSync(resizedPath);
    const coverBytesRaw = fs.readFileSync(coverPath);

    // [3] suntik XMP & append
    const xmp = buildXMP(videoBytes.length);
    const coverWithXMP = insertXMPIntoJPEG(coverBytesRaw, xmp);
    const finalBuffer = Buffer.concat([coverWithXMP, videoBytes]);

    // bersihin temp file
    fs.unlinkSync(coverPath);
    fs.unlinkSync(resizedPath);

    return finalBuffer;
  } catch (err) {
    // Cleanup kalo error
    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    if (fs.existsSync(resizedPath)) fs.unlinkSync(resizedPath);
    throw err;
  }
}

module.exports = { convertToMotionPhoto };

const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// =====================================================================
// 🌐 CONFIGURATION & SETTINGS
// =====================================================================
const CLOUD_NAME = "djlipqlut";
const BANNER_WIDTH = 380;
const BANNER_MARGIN_X = 10;
const BANNER_MARGIN_Y = 40;

const FALLBACK_PIN_QUEUE_TSV =
  "https://docs.google.com/spreadsheets/d/1MrwItyy6IPNLSJbz1b53TGOTS2JBLTyg46Ql9xZpI6w/gviz/tq?tqx=out:csv&sheet=PinterestQueue";

// =====================================================================
// 🏊‍♂️ FACEBOOK PAGES POOL
// =====================================================================
const FB_PAGES_POOL = [
  {
    name: "Love & Feelings",
    pageId: "1010347005495122",
    accessToken:
      "EAAa8JIAfxkMBSkdYd1VLNhYrBZB8YxvGCqDLZAd3ZB5RDLnFBHqNOLZBmlXREGg57QxkXH2flugsmCDguvlWsDHPfeQwwCtMblBilBz7PkyuDokDdiIDSate5zu7lklBu4ZA5LZA5mymhbMWUDvGx1aRFvn4raHRbTMw8xOEvKHGbH6TIO2nY8C0zUpXIiyMTOz9NZC",
    sticker: "fbsticker_a",
    tagPrefix: "a"
  },
  {
    name: "Positive Vibes Only",
    pageId: "1037521126108764",
    accessToken:
      "EAAa8JIAfxkMBSsn5ZAkQmbYV1gOIGrwOenNxH2SxBqnUgG0VmzyYidBoFTJK7Cb9qUHyzQRQXNfyN1CxVZB84usZCCcEsVXhBGJfYCbFhu5G5dl2RFQRQCfLZCmQBRSwfH59Igr5IHxSxkA1P4784UEoJxpEx0ON8rB6D6LAbMcl6hZBYbyW9q3lDGcNP5R2ms2kv",
    sticker: "fbsticker_b",
    tagPrefix: "b"
  }
];

// Extract base Cloudinary public ID from URL
function extractPublicId(url) {
  const match = url.match(/\/([^\/\?]+)\.mp4/);
  return match ? match[1] : null;
}

// CSV Parser Helper
function parseCSVLine(text) {
  let p = "",
    row = [""],
    i = 0,
    q = false;
  for (let c of text) {
    if (c === '"') {
      if (q && p === '"') {
        row[i] += '"';
      }
      q = !q;
    } else if (c === "," && !q) {
      row[++i] = "";
    } else if (c === "\n" && !q) {
      break;
    } else {
      row[i] += c;
    }
    p = c;
  }
  return row;
}

// Download file helper (Videos & Stickers)
async function downloadFile(url, targetPath) {
  const res = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
    timeout: 60000
  });
  const writer = fs.createWriteStream(targetPath);
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Render video with sticker overlay locally using FFmpeg
function renderVideoWithSticker(inputVideo, stickerImg, outputPath) {
  const filterString = "[1:v]scale=" + BANNER_WIDTH + ":-1[stk];[0:v][stk]overlay=" + BANNER_MARGIN_X + ":" + BANNER_MARGIN_Y;
  const cmd = 'ffmpeg -y -i "' + inputVideo + '" -i "' + stickerImg + '" -filter_complex "' + filterString + '" -c:a copy -preset ultrafast "' + outputPath + '"';
  execSync(cmd, { stdio: "pipe" });
}

// Single Reel Publisher to Graph API
async function publishReel(page, localVideoPath, caption) {
  console.log("\n🚀 Processing Page: [" + page.name + "] (" + page.pageId + ")");
  console.log("📝 Modified Caption: " + caption);

  // Phase 1: Initialize
  const initRes = await axios.post(
    "https://graph.facebook.com/v19.0/" + page.pageId + "/video_reels",
    {
      upload_phase: "start",
      access_token: page.accessToken
    }
  );

  const video_id = initRes.data.video_id;
  const upload_url = initRes.data.upload_url;
  console.log("📦 Initialized. Video ID: " + video_id);

  // Phase 2: Read Local Binary Stream
  const videoBuffer = fs.readFileSync(localVideoPath);

  await axios.post(upload_url, videoBuffer, {
    headers: {
      Authorization: "OAuth " + page.accessToken,
      offset: "0",
      file_size: videoBuffer.length.toString(),
      "Content-Type": "application/octet-stream"
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000
  });
  console.log(
    "📤 Uploaded " + (videoBuffer.length / (1024 * 1024)).toFixed(2) + " MB binary data."
  );

  // Phase 3: Publish
  const publishRes = await axios.post(
    "https://graph.facebook.com/v19.0/" + page.pageId + "/video_reels",
    {
      upload_phase: "finish",
      video_id: video_id,
      video_state: "PUBLISHED",
      description: caption,
      access_token: page.accessToken
    }
  );

  const finalVideoId = publishRes.data && publishRes.data.video_id ? publishRes.data.video_id : video_id;
  console.log("✅ Success! Reel published on [" + page.name + "]. Video ID: " + finalVideoId);
}

// Main Runner
async function main() {
  const baseVideoPath = path.join(__dirname, "base_raw.mp4");

  try {
    console.log("🔍 Fetching latest processed reel from PinterestQueue...");

    const sheetRes = await axios.get(FALLBACK_PIN_QUEUE_TSV, {
      timeout: 15000
    });
    const lines = sheetRes.data.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length <= 1) {
      throw new Error("PinterestQueue is empty or missing data.");
    }

    const lastLine = lines[lines.length - 1];
    const cols = parseCSVLine(lastLine);

    const latestVideoUrl = cols[0] ? cols[0].replace(/^"|"$/g, "").trim() : "";
    const mainCaption = cols[1] ? cols[1].replace(/^"|"$/g, "").trim() : "";

    if (!latestVideoUrl.startsWith("http")) {
      throw new Error("Invalid video URL in the last row: " + latestVideoUrl);
    }

    const cloudVideoId = extractPublicId(latestVideoUrl);
    if (!cloudVideoId) {
      throw new Error(
        "Could not extract Cloudinary Public ID from: " + latestVideoUrl
      );
    }

    console.log("🎯 Detected Video Public ID: " + cloudVideoId);
    console.log("📋 Original Main Caption: " + mainCaption);

    // Facebook Caption Clean: "Visit Site" -> "Check Bio"
    const fbCleanCaption = mainCaption.replace(/visit\s*site/gi, "Check Bio");
    console.log("✨ FB Formatted Caption: " + fbCleanCaption);

    // Download raw base video ONCE (Zero transformation credits used)
    const rawVideoUrl = "https://res.cloudinary.com/" + CLOUD_NAME + "/video/upload/" + cloudVideoId + ".mp4";
    console.log("⬇️ Downloading base video: " + rawVideoUrl);
    await downloadFile(rawVideoUrl, baseVideoPath);

    // Sequential loop across pool with isolated error handling
    for (const page of FB_PAGES_POOL) {
      const stickerPath = path.join(__dirname, page.sticker + ".png");
      const renderedVideoPath = path.join(__dirname, "rendered_" + page.pageId + ".mp4");

      try {
        // Plain string concatenation (no template literal escape bug)
        const modifiedCaption = page.tagPrefix + fbCleanCaption;

        // 1. Fetch sticker PNG from Cloudinary
        const stickerUrl = "https://res.cloudinary.com/" + CLOUD_NAME + "/image/upload/" + page.sticker + ".png";
        await downloadFile(stickerUrl, stickerPath);

        // 2. Render local video with sticker via FFmpeg
        console.log("🎬 Rendering local reel with sticker [" + page.sticker + "] for " + page.name + "...");
        renderVideoWithSticker(baseVideoPath, stickerPath, renderedVideoPath);

        // 3. Publish to Facebook Graph API
        await publishReel(page, renderedVideoPath, modifiedCaption);
      } catch (err) {
        const errMsg = err.response
          ? JSON.stringify(err.response.data)
          : err.message;
        console.error("❌ [Page Skipped: " + page.name + "]: " + errMsg);
      } finally {
        // Cleanup per-page temp files immediately
        if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
        if (fs.existsSync(renderedVideoPath)) fs.unlinkSync(renderedVideoPath);
      }
    }

    console.log("\n🏁 All FB pool pages processing completed!");
    process.exit(0);
  } catch (error) {
    console.error("🚨 Distributor initialization error:", error.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(baseVideoPath)) {
      fs.unlinkSync(baseVideoPath);
    }
  }
}

main();

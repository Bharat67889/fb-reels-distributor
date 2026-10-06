const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// =====================================================================
// 🌐 CONFIGURATION & SETTINGS
// =====================================================================
const CLOUD_NAME = "djlipqlut";
const BANNER_WIDTH = 380;
const BANNER_MARGIN_X = 10;
const BANNER_MARGIN_Y = 40;

// Random Stickers Pool (inme se koi bhi randomly pick hoga)
const AVAILABLE_STICKERS = ["fbsticker", "fbsticker_a", "fbsticker_b"];

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
    tagPrefix: "a"
  },
  {
    name: "Positive Vibes Only",
    pageId: "1037521126108764",
    accessToken:
      "EAAa8JIAfxkMBSsn5ZAkQmbYV1gOIGrwOenNxH2SxBqnUgG0VmzyYidBoFTJK7Cb9qUHyzQRQXNfyN1CxVZB84usZCCcEsVXhBGJfYCbFhu5G5dl2RFQRQCfLZCmQBRSwfH59Igr5IHxSxkA1P4784UEoJxpEx0ON8rB6D6LAbMcl6hZBYbyW9q3lDGcNP5R2ms2kv",
    tagPrefix: "b"
  },
  {
    name: "True Friendship",
    pageId: "1040901179111632",
    accessToken:
      "EAAa8JIAfxkMBSqXdq8KSoc7lU79gRfycXBuTJ2XeQYNEoSKOivTidHSZCiFUE3dkF1ZAZA89ZCzyRGzLGZAyMRPIbBXfJ7Y4HLtQnMICe0lVQD2slnCVrUSOkvZAy7DoqRq1Vlwvh9M3IEZABeivKWLdxjxVG4AWkXGmGN7a0QpMjn5SBzUMeCP32Ud50BpYZAsOkFQuDZCy4",
    tagPrefix: "c"
  },
{
    name: "Success Mindset",
    pageId: "920483017826220",
    accessToken:
      "EAAa8JIAfxkMBSh135kS9tYgz1tkZC6TXqIpY4rNuGpoZCejGofECpeIeg1dxewgRi2vfZBEwVZBy65sdZBTLjqnwnrxyaFr1NcWnyZB5ZCSqntZAMQ75pLQmoMTtDe9OsZCQv4FiGXQTlOQUQ1T6SaT8bIhOVOlUZCAl8zJ0PeZC64k0xHKab8WMnofhrNYjMDChbUeAp2E",
    tagPrefix: "d"
  },
  {
    name: "Real Life Wisdom",
    pageId: "919965154544056",
    accessToken:
      "EAAa8JIAfxkMBSlctGjrLclFMnkvkjsxrdHJXhqtVUP9U2i6ZA1KTuK2ichRsY6OVsAKdZCHl8WPR6GAS9ctoe5I81a4JdYuG4x6B1DA8oHfmCBa7OOYX01MsFr5VSDqZA8xVzNdyFOVFm6JXPWCggL9mP5qZBamgsZBc4GH6x5ZCVkqmezwNjMoal7bjDh4ke4LzPCQ9Yr",
    tagPrefix: "e"
  },
  {
    name: "Rise Everyday",
    pageId: "934706813069026",
    accessToken:
      "EAAa8JIAfxkMBShhLWLfmNnZBq4sRgdXjeeyZCJsg5erTDSBi0PWoefZCOVhnGPpxMpGZCjfMeEJfAVbCdOtSZAvtGjFQEbIWTxB70TZAIZCIQW4BQxadLWSsCshOTrzTGtLHx2kcyLHIGN5nZBserkx9nY0ZC7FTZA9P6pZA2R02HeZAqnZAesXdbwYUnesNBpaecotOq5CdR",
    tagPrefix: "f"
  },
  {
    name: "Coloring Books hub 13",
    pageId: "1011660995364685",
    accessToken:
      "EAAa8JIAfxkMBSjXA8ZCl5kBZCIjvhzs28ZAyRC0T5nNRnh4rCTAN4RvGQjGcbx6WjrBK3NkxL9JiJf8Uz3Cji3dH1eVoHuaT5NtDByJBZCTOKgTyYdcQZAhi3ZBYSvZB5G1AUl7ZBLF8JdZBAT6zZCpusCYC3dhs2Q0MFaevQURUZBawb4kBRvkoRjLxm0uMgNQCUy33CuwX8ZBg",
    tagPrefix: "g"
  },
{
    name: "Coloring Books hub 12",
    pageId: "1110294448823674",
    accessToken:
      "EAAa8JIAfxkMBSnBe1VN7ZCZCdTcil1I7e3uxahP1jLh9z9tZBe4HqV2upS09ko00g6Nl6cP2LaG2vbLLXNygN7xi3MLMgTClhKSdZBABZBDqOcgHIvG1pq3qZArRZCAtX0EFDe1HcVdwNIXeDZAZAEpdELaKGZC0JnPN8Us7PBYUgbyoUWulXpe41Mu0SM74FzQ66917FK83GJ",
    tagPrefix: "h"
  },
  {
    name: "Alpha Attitude",
    pageId: "983125891550077",
    accessToken:
      "EAAa8JIAfxkMBShhKX9Xo0pbC6oWZAGm5xUgo2wsMN4eOSAHuoy4B0Gq1gDMgcwXgZCeQVCn89py0Uhy1SajVlTIpXasmABN2dOC7XfFYxZCNIyCsHU2AemZBB1D7eVFUJbcvQtyO9h09vsLNKdg0rh1ZAwjx6sOASxPGsILxn9W8LMxlp5bubALjHPDoyrUfUYoJU9X9W",
    tagPrefix: "i"
  },
  {
    name: "A to Z Books",
    pageId: "891602070713772",
    accessToken:
      "EAAa8JIAfxkMBSjb7opVu1sHiAoARasUXy9iTdl1ZAoz0p3AgKwhzqIwAftQ2XFsXIZBZAyNCdyzifodTkf6PvjMwqZBgaI2kLJuSncNnvLhwRQSxdPaQBHqyAGxfyKvHZCUL3ss0yKaQwNFfRvZAGl7EQxvVLURcHoNTfn2tThz3MTIdtb0Wb588qRY48gsJReyOzK",
    tagPrefix: "j"
  },
  {
    name: "Deep Inside Us",
    pageId: "1033610549825307",
    accessToken:
      "EAAa8JIAfxkMBSsZA1TaUexVxTceZATqoZBYWFpde4Mnw7NKZBHvpJPaMnNi3ehqg3TuZBXRvO8vvT0cZBZCuztzizp2RPQXKzTacZAetaXz56J75qeyJTUc8L1Y50fi6sqZATwSxNQRexbphzIJAaQNuJjj1lEakWZClwtgAlhGnuHZAxbkzEQL7yCR21rX7REgXtxfaw1wPGRO",
    tagPrefix: "k"
  },
  {
    name: "Brain Sparks",
    pageId: "973044389215643",
    accessToken:
      "EAAa8JIAfxkMBSkp5J6tM1xHDA9i3VfdZB3ZArYtWE5o5xzXLffw36fpOMQqkAk7Sih8cxXt4EZAd8xRurbZCiwdNKENgucf0d8OK1lZC2WIP4RvERiXBg0hUK14C5CWmgbh1kPb9ZCAgYq7wgEOx08TZAYRa2tNaGZBR7x65YsHIx6eN5vszWzNMaWXjEKuhqSoZCHIZCZB",
    tagPrefix: "l"
  },
  {
    name: "Prajapati Apps",
    pageId: "991944033992816",
    accessToken:
      "EAAa8JIAfxkMBSo3pGRBfOaT3ISnWpgCKapGzvkfMSHFvSa64pR9xDZCJ9iokIuxuTFIooI0NREUPDDfUNL6EViybWWIYfVyG9xSQqZC2vYWZCZCvboyzHrkPajUCz30sX6X1EZBadyRH1EaQaGZB8zSma22AIVpplz6nmCecQtPX2EsezZC5vYrYVNCetfHLpdxMGMc",
    tagPrefix: "m"
  },
{
    name: "Coloring Books studio",
    pageId: "831082850097688",
    accessToken:
      "EAAa8JIAfxkMBSjFE0GaqIEZBL5Q6aC7dBFPjzpZBweLHaMPSZCc8vxyFpeUv023ZBTrvexYvb3KFQGqZBbQvS0ZCT3AkJSBZCp0qht0qPk5jKLJhfZBCvHmqA4JZBpCZCgrtcoAElUVKF4rPuQL8fEOV0JDSaOrL9RtdXBp5OxHp4I428ohsAlCv1SscJ7NDwymhEd2FGp",
    tagPrefix: "n"
  },











  
];

// Random sticker picker
function getRandomSticker() {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_STICKERS.length);
  return AVAILABLE_STICKERS[randomIndex];
}

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

// Render video locally with sticker + Algorithm-Proof Micro Tweaks
function renderVideoWithSticker(inputVideo, stickerImg, outputPath, pageIndex) {
  // Page index ke hisaab se subtle mathematical color & crop variance (Human eye ko dikhega bhi nahi)
  const contrastMod = (1.001 + (pageIndex * 0.002)).toFixed(3);
  const brightnessMod = (0.001 + (pageIndex * 0.001)).toFixed(3);
  const cropPixels = (pageIndex % 2 === 0) ? 2 : 0; // 2-pixel subtle crop
  const uniqueMetadataHash = crypto.randomBytes(8).toString("hex");

  // Filter chain: 
  // 1. [0:v] eq filter modifies brightness/contrast by 0.2%
  // 2. crop filter shifts frame matrix
  // 3. sticker overlay applied
  const filterString = "[0:v]crop=in_w-" + cropPixels + ":in_h-" + cropPixels + ",eq=contrast=" + contrastMod + ":brightness=" + brightnessMod + "[base];" +
                       "[1:v]scale=" + BANNER_WIDTH + ":-1[stk];" +
                       "[base][stk]overlay=" + BANNER_MARGIN_X + ":" + BANNER_MARGIN_Y;

  const cmd = 'ffmpeg -y -i "' + inputVideo + '" -i "' + stickerImg + '" ' +
              '-filter_complex "' + filterString + '" ' +
              '-metadata comment="uid_' + uniqueMetadataHash + '" ' +
              '-c:a copy -preset ultrafast "' + outputPath + '"';

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
    for (let i = 0; i < FB_PAGES_POOL.length; i++) {
      const page = FB_PAGES_POOL[i];
      const chosenSticker = getRandomSticker();
      const stickerPath = path.join(__dirname, chosenSticker + ".png");
      const renderedVideoPath = path.join(__dirname, "rendered_" + page.pageId + ".mp4");

      try {
        const modifiedCaption = page.tagPrefix + fbCleanCaption;

        // 1. Fetch random sticker PNG from Cloudinary
        const stickerUrl = "https://res.cloudinary.com/" + CLOUD_NAME + "/image/upload/" + chosenSticker + ".png";
        await downloadFile(stickerUrl, stickerPath);

        // 2. Render locally with sticker + unique binary tweaks
        console.log("🎬 Rendering reel for [" + page.name + "] using sticker [" + chosenSticker + "] (Unique hash applied)...");
        renderVideoWithSticker(baseVideoPath, stickerPath, renderedVideoPath, i);

        // 3. Publish to Facebook Graph API
        await publishReel(page, renderedVideoPath, modifiedCaption);
      } catch (err) {
        const errMsg = err.response
          ? JSON.stringify(err.response.data)
          : err.message;
        console.error("❌ [Page Skipped: " + page.name + "]: " + errMsg);
      } finally {
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

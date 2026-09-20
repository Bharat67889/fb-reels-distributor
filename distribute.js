const axios = require("axios");

// =====================================================================
// 🌐 CONFIGURATION & SETTINGS
// =====================================================================
const CLOUD_NAME = "djlipqlut";
const BANNER_WIDTH = 380;
const BANNER_GRAVITY = "north_west";
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
    tagPrefix: "b",
    sticker: "fbsticker_b",
    accessToken:
      "EAAa8JIAfxkMBSsn5ZAkQmbYV1gOIGrwOenNxH2SxBqnUgG0VmzyYidBoFTJK7Cb9qUHyzQRQXNfyN1CxVZB84usZCCcEsVXhBGJfYCbFhu5G5dl2RFQRQCfLZCmQBRSwfH59Igr5IHxSxkA1P4784UEoJxpEx0ON8rB6D6LAbMcl6hZBYbyW9q3lDGcNP5R2ms2kv"
  }
];

function buildCloudinaryUrl(publicId, stickerName) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/l_${stickerName},w_${BANNER_WIDTH},g_${BANNER_GRAVITY},x_${BANNER_MARGIN_X},y_${BANNER_MARGIN_Y}/${publicId}.mp4`;
}

function extractPublicId(url) {
  const match = url.match(/\/([^\/\?]+)\.mp4/);
  return match ? match[1] : null;
}

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

async function publishReel(page, videoUrl, caption) {
  console.log(`\n🚀 Processing Page: [${page.name}] (${page.pageId})`);
  console.log(`📝 Modified Caption: ${caption}`);

  const initRes = await axios.post(
    `https://graph.facebook.com/v19.0/${page.pageId}/video_reels`,
    {
      upload_phase: "start",
      access_token: page.accessToken
    }
  );

  const { video_id, upload_url } = initRes.data;
  console.log(`📦 Initialized. Video ID: ${video_id}`);

  const videoStream = await axios.get(videoUrl, {
    responseType: "arraybuffer",
    timeout: 60000
  });
  const videoBuffer = Buffer.from(videoStream.data);

  await axios.post(upload_url, videoBuffer, {
    headers: {
      Authorization: `OAuth ${page.accessToken}`,
      offset: "0",
      file_size: videoBuffer.length.toString(),
      "Content-Type": "application/octet-stream"
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000
  });
  console.log(
    `📤 Uploaded ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB binary data.`
  );

  const publishRes = await axios.post(
    `https://graph.facebook.com/v19.0/${page.pageId}/video_reels`,
    {
      upload_phase: "finish",
      video_id: video_id,
      video_state: "PUBLISHED",
      description: caption,
      access_token: page.accessToken
    }
  );

  console.log(
    `✅ Success! Reel published on [${page.name}]. Video ID: ${
      publishRes.data.video_id || video_id
    }`
  );
}

async function main() {
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

    console.log(`🎯 Detected Video Public ID: ${cloudVideoId}`);
    console.log(`📋 Original Main Caption: ${mainCaption}`);

    for (const page of FB_PAGES_POOL) {
      try {
        const modifiedCaption = `${page.tagPrefix}${mainCaption}`;
        const videoUrl = buildCloudinaryUrl(cloudVideoId, page.sticker);
        await publishReel(page, videoUrl, modifiedCaption);
      } catch (err) {
        const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(`❌ [Page Skipped: ${page.name}]: ${errMsg}`);
      }
    }

    console.log("\n🏁 All pool pages processing completed!");
    process.exit(0);
  } catch (error) {
    console.error("🚨 Distributor initialization error:", error.message);
    process.exit(1);
  }
}

main();

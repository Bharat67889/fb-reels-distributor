
const axios = require("axios");

// =====================================================================
// 🌐 CONFIGURATION & SETTINGS
// =====================================================================
const CLOUD_NAME = "djlipqlut";
const BANNER_WIDTH = 380;
const BANNER_GRAVITY = "north_west";
const BANNER_MARGIN_X = 10;
const BANNER_MARGIN_Y = 40;

// PinterestQueue TSV URL (Col 1 = Video URL, Col 2 = Exact Main Caption)
const PIN_QUEUE_TSV_URL = "https://docs.google.com/spreadsheets/d/1MrwItyy6IPNLSJbz1b53TGOTS2JBLTyg46Ql9xZpI6w/export?format=tsv&gid=1152069251"; 
// Note: Agar sheet ka gid alag ho toh normal export URL bhi chalega:
const FALLBACK_PIN_QUEUE_TSV = "https://docs.google.com/spreadsheets/d/1MrwItyy6IPNLSJbz1b53TGOTS2JBLTyg46Ql9xZpI6w/gviz/tq?tqx=out:csv&sheet=PinterestQueue";

// =====================================================================
// 🏊‍♂️ FACEBOOK PAGES POOL (Bas yahan copy-paste karke naye pages add karo)
// =====================================================================
const FB_PAGES_POOL = [
  {
    name: "Love & Feelings",
    pageId: "1010347005495122",
    accessToken: "EAAa8JIAfxkMBSkdYd1VLNhYrBZB8YxvGCqDLZAd3ZB5RDLnFBHqNOLZBmlXREGg57QxkXH2flugsmCDguvlWsDHPfeQwwCtMblBilBz7PkyuDokDdiIDSate5zu7lklBu4ZA5LZA5mymhbMWUDvGx1aRFvn4raHRbTMw8xOEvKHGbH6TIO2nY8C0zUpXIiyMTOz9NZC",
    sticker: "fbsticker_a",
    tagPrefix: "A"
  }
  /*
  // Naya Page add karne ke liye bas ye uncomment karo:
  ,{
    name: "Next Page Name",
    pageId: "PAGE_ID_HERE",
    accessToken: "TOKEN_HERE",
    sticker: "fbsticker_b",
    tagPrefix: "B"
  }
  */
];

// Cloudinary URL Generator
function buildCloudinaryUrl(publicId, stickerName) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/l_${stickerName},w_${BANNER_WIDTH},g_${BANNER_GRAVITY},x_${BANNER_MARGIN_X},y_${BANNER_MARGIN_Y}/${publicId}.mp4`;
}

// Extract base Cloudinary public ID from URL
function extractPublicId(url) {
  const match = url.match(/\/([^\/\?]+)\.mp4/);
  return match ? match[1] : null;
}

// CSV Parser Helper
function parseCSVLine(text) {
  let p = '', row = [''], i = 0, r = 0, q = false;
  for (let c of text) {
    if (c === '"') {
      if (q && p === '"') { row[i] += '"'; }
      q = !q;
    } else if (c === ',' && !q) {
      row[++i] = '';
    } else if (c === '\n' && !q) {
      break;
    } else {
      row[i] += c;
    }
    p = c;
  }
  return row;
}

// Single Reel Publisher to Graph API
async function publishReel(page, videoUrl, caption) {
  console.log(`\n🚀 Processing Page: [${page.name}] (${page.pageId})`);
  console.log(`📝 Modified Caption: ${caption}`);
  
  // Phase 1: Initialize
  const initRes = await axios.post(`https://graph.facebook.com/v19.0/${page.pageId}/video_reels`, {
    upload_phase: "start",
    access_token: page.accessToken
  });

  const { video_id, upload_url } = initRes.data;
  console.log(`📦 Initialized. Video ID: ${video_id}`);

  // Phase 2: Fetch Bytes & Upload Binary Stream
  const videoStream = await axios.get(videoUrl, { responseType: "arraybuffer" });
  const videoBuffer = Buffer.from(videoStream.data);

  await axios.post(upload_url, videoBuffer, {
    headers: {
      Authorization: `OAuth ${page.accessToken}`,
      offset: "0",
      file_size: videoBuffer.length.toString(),
      "Content-Type": "application/octet-stream"
    }
  });
  console.log(`📤 Uploaded ${ (videoBuffer.length / (1024 * 1024)).toFixed(2) } MB binary data.`);

  // Phase 3: Publish
  const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${page.pageId}/video_reels`, {
    upload_phase: "finish",
    video_id: video_id,
    video_state: "PUBLISHED",
    description: caption,
    access_token: page.accessToken
  });

  console.log(`✅ Success! Reel published on [${page.name}]. Video ID: ${publishRes.data.video_id || video_id}`);
}

// Main Runner
async function main() {
  try {
    console.log("🔍 Fetching latest processed reel from PinterestQueue...");

    // Sheet se latest row read karo
    const sheetRes = await axios.get(FALLBACK_PIN_QUEUE_TSV);
    const lines = sheetRes.data.split("\n").filter(l => l.trim().length > 0);

    if (lines.length <= 1) {
      throw new Error("PinterestQueue is empty or missing data.");
    }

    // Last line uthao
    const lastLine = lines[lines.length - 1];
    const cols = parseCSVLine(lastLine);

    const latestVideoUrl = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : "";
    const mainCaption = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : "";

    if (!latestVideoUrl.startsWith("http")) {
      throw new Error("Invalid video URL in the last row: " + latestVideoUrl);
    }

    const cloudVideoId = extractPublicId(latestVideoUrl);
    if (!cloudVideoId) {
      throw new Error("Could not extract Cloudinary Public ID from: " + latestVideoUrl);
    }

    console.log(`🎯 Detected Video Public ID: ${cloudVideoId}`);
    console.log(`📋 Original Main Caption: ${mainCaption}`);

    // Sequential posting loop
    for (const page of FB_PAGES_POOL) {
      // Main caption ke theek aage A, B, C prefix lag gaya
      const modifiedCaption = `${page.tagPrefix}${mainCaption}`;
      const videoUrl = buildCloudinaryUrl(cloudVideoId, page.sticker);

      try {
        await publishReel(page, videoUrl, modifiedCaption);
      } catch (err) {
        console.error(`❌ Failed on page [${page.name}]:`, err.response ? err.response.data : err.message);
      }
    }

    console.log("\n🏁 All pool pages completed successfully!");
  } catch (error) {
    console.error("🚨 Distributor error:", error.message);
    process.exit(1);
  }
}

main();

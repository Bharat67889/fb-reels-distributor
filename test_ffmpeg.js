const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CLOUD_NAME = "djlipqlut";
const BANNER_WIDTH = 380;
const BANNER_MARGIN_X = 10;
const BANNER_MARGIN_Y = 40;

const FALLBACK_PIN_QUEUE_TSV =
  "https://docs.google.com/spreadsheets/d/1MrwItyy6IPNLSJbz1b53TGOTS2JBLTyg46Ql9xZpI6w/gviz/tq?tqx=out:csv&sheet=PinterestQueue";

// Test Pool (Donon stickers test karne ke liye)
const TEST_PAGES = [
  {
    name: "Love & Feelings (Test)",
    sticker: "fbsticker_a"
  },
  {
    name: "Positive Vibes Only (Test)",
    sticker: "fbsticker_b"
  }
];

function parseCSVLine(text) {
  let p = "", row = [""], i = 0, q = false;
  for (let c of text) {
    if (c === '"') {
      if (q && p === '"') row[i] += '"';
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

async function downloadFile(url, targetPath) {
  console.log("⬇️ Downloading asset: " + url);
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

function renderVideoWithSticker(inputVideo, stickerImg, outputPath) {
  const cmd = `ffmpeg -y -i "\({inputVideo}" -i "\){stickerImg}" -filter_complex "[1:v]scale=\({BANNER_WIDTH}:-1[stk];[0:v][stk]overlay=\){BANNER_MARGIN_X}:\({BANNER_MARGIN_Y}" -c:a copy -preset ultrafast "\){outputPath}"`;
  console.log(`🎬 Running FFmpeg Render: ${outputPath}`);
  execSync(cmd, { stdio: "inherit" });
}

async function testMain() {
  const baseVideoPath = path.join(__dirname, "base_raw.mp4");
  const outputDir = path.join(__dirname, "test_outputs");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  try {
    console.log("🔍 Reading PinterestQueue Sheet...");
    const sheetRes = await axios.get(FALLBACK_PIN_QUEUE_TSV, { timeout: 15000 });
    const lines = sheetRes.data.split("\n").filter((l) => l.trim().length > 0);
    const lastLine = lines[lines.length - 1];
    const cols = parseCSVLine(lastLine);

    let latestVideoUrl = cols[0] ? cols[0].replace(/^"|"$/g, "").trim() : "";
    if (!latestVideoUrl.startsWith("http")) {
      throw new Error("Invalid video URL in the last row: " + latestVideoUrl);
    }

    // Agar URL me pehle se koi transformation lagi ho toh use hata kar raw video URL bana lo
    const rawVideoUrl = latestVideoUrl.replace(/\/video\/upload\/.*\/([^\/]+\.mp4)$/, "/video/upload/$1");
    console.log("🎯 Raw Base Video URL: " + rawVideoUrl);

    // 1. Download Base Video (Zero transformation credits used)
    await downloadFile(rawVideoUrl, baseVideoPath);

    // 2. Stickers download karo aur FFmpeg se overlay lagao
    for (const item of TEST_PAGES) {
      console.log(`\n--- 🧪 Testing sticker: \({item.sticker} for\){item.name} ---`);
      const stickerPath = path.join(__dirname, `${item.sticker}.png`);
      const stickerUrl = `https://res.cloudinary.com/\({CLOUD_NAME}/image/upload/\){item.sticker}.png`;
      
      await downloadFile(stickerUrl, stickerPath);

      const outVideo = path.join(outputDir, `output_${item.sticker}.mp4`);
      renderVideoWithSticker(baseVideoPath, stickerPath, outVideo);

      console.log(`✅ Generated successfully: output_${item.sticker}.mp4`);
      if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
    }

    console.log("\n🎉 TEST COMPLETE! Dono test videos ready hain.");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(baseVideoPath)) fs.unlinkSync(baseVideoPath);
  }
}

testMain();

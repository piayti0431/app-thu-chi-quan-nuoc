export default async function handler(req, res) {
  const text = req.query.text || req.query.q || "";
  const voice = req.query.voice || "google_vi";
  const speed = req.query.speed || req.query.rate || "1.0";

  if (!text) {
    return res.status(400).json({ error: "Missing text query" });
  }

  const cleanText = String(text).slice(0, 500);

  try {
    // Google Vietnamese TTS
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&ttsspeed=${encodeURIComponent(speed)}&q=${encodeURIComponent(cleanText)}`;
    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "TTS upstream error" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("TTS API Error:", error);
    return res.status(500).json({ error: "Failed to generate TTS audio" });
  }
}

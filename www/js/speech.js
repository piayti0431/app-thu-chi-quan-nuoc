import { docSoTiengViet } from "./report.js";

let webRecognition = null;
let partialListener = null;
let stateListener = null;
let isListening = false;
let lastText = "";
let nativeFinalSent = false;
let nativeTimeout = null;
let nativeStartPromise = null;
let activeOnResult = null;
let activeOnError = null;
let activeSession = 0;
let currentAudio = null;

function normalizeSpeechText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptScore(text) {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return 0;
  let score = Math.min(normalized.length / 100, 1);
  if (normalized.includes("mia")) score += 3;
  if (normalized.includes("cam")) score += 3;
  if (/\b(1|mot)\s*(lit|lich|lid|liet|let|l|it)\b/.test(normalized) || normalized.includes("1l")) score += 5;
  if (/\b(ly|coc|chai|binh)\b/.test(normalized)) score += 2;
  if (/\b(k|nghin|ngan|trieu)\b/.test(normalized) || /\d/.test(normalized)) score += 2;
  if (/\b(ban|thu|khach|mua|tra)\b/.test(normalized)) score += 1;
  return score;
}

function firstMatch(result) {
  if (!Array.isArray(result?.matches)) return result?.value || "";
  return [...result.matches].sort((a, b) => transcriptScore(b) - transcriptScore(a))[0] || "";
}

function withTimeout(promise, ms) {
  if (!promise) return Promise.resolve(null);
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

function resetNativeListeners() {
  const removals = [];
  if (partialListener?.remove) removals.push(partialListener.remove());
  partialListener = null;
  if (stateListener?.remove) removals.push(stateListener.remove());
  stateListener = null;
  return Promise.allSettled(removals);
}

function nativePlugins() {
  return window.Capacitor?.Plugins || {};
}

function isNative() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function shouldContinue(session) {
  return session === activeSession && isListening;
}

export async function yeuCauQuyenMicro() {
  const { SpeechRecognition } = nativePlugins();
  if (isNative() && SpeechRecognition) {
    try {
      let permission = await SpeechRecognition.checkPermissions?.();
      if (permission?.speechRecognition !== "granted") {
        permission = await SpeechRecognition.requestPermissions?.();
      }
      return permission?.speechRecognition === "granted";
    } catch (e) {
      console.warn("Native mic permission error", e);
      return false;
    }
  }

  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.warn("Web mic permission denied/error", err);
      return false;
    }
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function phatTiengChuongTingTing() {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1046.5, now, 0.25);        // C6 (Ting 1)
    playTone(1318.51, now + 0.12, 0.35); // E6 (Ting 2)
  } catch (err) {
    console.warn("Web Audio Ting Ting error:", err);
  }
}

export async function batDauNghe(onKetQua, onLoi) {
  if (isListening) return;
  isListening = true;
  const session = activeSession + 1;
  activeSession = session;
  lastText = "";
  nativeFinalSent = false;
  nativeStartPromise = null;
  activeOnResult = onKetQua;
  activeOnError = onLoi;

  try {
    const { SpeechRecognition } = nativePlugins();
    if (isNative() && SpeechRecognition) {
      const available = await SpeechRecognition.available?.();
      if (!shouldContinue(session)) return;
      if (available && available.available === false) {
        throw new Error("Thiết bị này không hỗ trợ nhận dạng giọng nói");
      }

      let permission = await SpeechRecognition.checkPermissions?.();
      if (!shouldContinue(session)) return;
      if (permission?.speechRecognition !== "granted") {
        permission = await SpeechRecognition.requestPermissions?.();
      }
      if (!shouldContinue(session)) return;
      if (permission?.speechRecognition !== "granted") {
        throw new Error("Chưa cấp quyền Micro. Vui lòng cấp quyền Micro trong Cài đặt ứng dụng để nói với Thư Ký EV!");
      }

      partialListener = await SpeechRecognition.addListener?.("partialResults", (data) => {
        if (!shouldContinue(session)) return;
        const text = firstMatch(data);
        if (text) {
          lastText = text;
          onKetQua({ text, isFinal: false });
        }
      });
      if (!shouldContinue(session)) {
        await resetNativeListeners();
        return;
      }

      stateListener = await SpeechRecognition.addListener?.("listeningState", (data) => {
        if (!shouldContinue(session)) return;
        if (data?.status === "stopped" && lastText && !nativeFinalSent) {
          nativeFinalSent = true;
          onKetQua({ text: lastText, isFinal: true });
        }
      });
      if (!shouldContinue(session)) {
        await resetNativeListeners();
        return;
      }

      nativeTimeout = setTimeout(() => {
        if (!lastText) activeOnError?.(new Error("Chưa nghe rõ câu nói, bạn vui lòng nói lại nhé!"));
        dungNghe().catch(() => {});
      }, 18000);

      nativeStartPromise = SpeechRecognition.start({
        language: "vi-VN",
        maxResults: 5,
        partialResults: true,
        popup: false,
      })
        .then((result) => {
          const finalText = firstMatch(result);
          if (session === activeSession && finalText && !nativeFinalSent) {
            nativeFinalSent = true;
            onKetQua({ text: finalText, isFinal: true });
          }
          return result;
        })
        .catch((error) => {
          if (session !== activeSession) return null;
          isListening = false;
          clearTimeout(nativeTimeout);
          nativeTimeout = null;
          resetNativeListeners();
          onLoi?.(error);
          return null;
        });

      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      throw new Error("Trình duyệt không hỗ trợ nhận giọng nói tiếng Việt. Vui lòng sử dụng Chrome/Safari hoặc mở app Android!");
    }

    if (webRecognition) {
      try {
        webRecognition.stop();
      } catch (_) {}
    }

    webRecognition = new SpeechRec();
    webRecognition.lang = "vi-VN";
    webRecognition.continuous = false;
    webRecognition.interimResults = true;

    webRecognition.onresult = (event) => {
      if (session !== activeSession) return;
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript || "")
        .join(" ");
      const isFinal = Boolean(event.results[0]?.isFinal);
      lastText = text;
      onKetQua({ text, isFinal });
    };

    webRecognition.onerror = (event) => {
      if (session !== activeSession) return;
      isListening = false;
      clearTimeout(nativeTimeout);
      nativeTimeout = null;
      let msg = event?.error || "Lỗi thu âm giọng nói";
      if (event?.error === "not-allowed" || event?.error === "permission-denied") {
        msg = "⚠️ Vui lòng cấp quyền Micro (bấm biểu tượng 🔒 hoặc 🎙️ trên thanh địa chỉ) để nói với Thư Ký EV!";
      } else if (event?.error === "no-speech") {
        msg = "Chưa nghe rõ câu nói, bạn vui lòng nói lại nhé!";
      }
      onLoi?.(new Error(msg));
    };

    webRecognition.onend = () => {
      if (session !== activeSession) return;
      clearTimeout(nativeTimeout);
      nativeTimeout = null;
      if (lastText && !nativeFinalSent) {
        nativeFinalSent = true;
        onKetQua({ text: lastText, isFinal: true });
      }
      isListening = false;
    };
    webRecognition.start();
  } catch (error) {
    isListening = false;
    clearTimeout(nativeTimeout);
    nativeTimeout = null;
    await resetNativeListeners();
    onLoi?.(error);
  }
}

export async function dungNghe() {
  const { SpeechRecognition } = nativePlugins();
  const session = activeSession;
  try {
    clearTimeout(nativeTimeout);
    nativeTimeout = null;
    if (isNative() && SpeechRecognition?.stop) {
      await withTimeout(Promise.resolve().then(() => SpeechRecognition.stop()).catch(() => null), 1200);
      const result = await withTimeout(nativeStartPromise, 1800);
      const finalText = firstMatch(result) || lastText;
      if (session === activeSession && finalText && !nativeFinalSent && activeOnResult) {
        nativeFinalSent = true;
        activeOnResult({ text: finalText, isFinal: true });
      }
      return { text: finalText || "", stopped: true };
    }
    if (webRecognition) webRecognition.stop();
    return { text: lastText || "", stopped: true };
  } finally {
    await resetNativeListeners();
    isListening = false;
    nativeStartPromise = null;
    activeOnResult = null;
    activeOnError = null;
    if (session === activeSession) activeSession += 1;
  }
}

export function chuanHoaLoiNoiTiengViet(rawText) {
  if (!rawText) return "";
  let text = String(rawText);

  // Strip Markdown formatting (bold, italic, headers, bullets, backticks, links)
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/#+\s*/g, "");
  text = text.replace(/^[\s*•\-–—]+\s*/gm, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Strip Emojis and miscellaneous symbols so TTS doesn't stumble or read them
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, " ");
  text = text.replace(/[—–]/g, ", ");
  text = text.replace(/[|•👉💡🚀🎉🛒🏷️💵📲🥤🧊🌾🎋⚠️🔴🟢✅🎯]/gu, " ");

  // Replace common business abbreviations with natural spoken Vietnamese
  text = text.replace(/\+\s*/g, "thu ");
  text = text.replace(/-\s*/g, "chi ");
  text = text.replace(/\b(ck|CK)\b/g, "chuyển khoản");
  text = text.replace(/\b(momo|MoMo|MOMO|Momo)\b/gi, "mô mô");
  text = text.replace(/\b(qr|QR)\b/g, "mã quy rờ");
  text = text.replace(/\b(cost|Cost)\b/g, "tiền vốn");
  text = text.replace(/\b(pos|POS)\b/g, "bán hàng");
  text = text.replace(/\b(ev|EV)\b/g, "E V");
  text = text.replace(/\b(cn2|CN2|cn 2|CN 2)\b/gi, "chi nhánh hai");
  text = text.replace(/\b(1l|1L|1 lít)\b/g, "một lít");
  text = text.replace(/\b10kg\b/gi, "mười ký");
  text = text.replace(/\b12 cây\b/gi, "mười hai cây");

  // Format currency with dots: "582.000 đ", "1.500.000 đồng"
  text = text.replace(/(\d{1,3}(?:\.\d{3})+)\s*(?:đ|dong|đồng)?/gi, (match, p1) => {
    const num = Number(p1.replace(/\./g, ""));
    return `${docSoTiengViet(num)} đồng`;
  });

  // Format "500k", "50k", "15k", "7k", "8k"
  text = text.replace(/(\d+)\s*(?:k|K)\b/g, (match, p1) => {
    const num = Number(p1) * 1000;
    return `${docSoTiengViet(num)} đồng`;
  });

  // Format remaining money numbers with currency suffix
  text = text.replace(/\b(\d+)\s*(?:đ|dong|đồng)\b/gi, (match, p1) => {
    return `${docSoTiengViet(Number(p1))} đồng`;
  });

  // Format standalone digits into Vietnamese words
  text = text.replace(/\b(\d+)\b/g, (match, p1) => {
    // Nếu là số điện thoại (bắt đầu bằng 0 và có từ 10 chữ số) -> đọc từng chữ số
    if (p1.length >= 10 && p1.startsWith("0")) {
      const digitNames = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
      return p1.split("").map((d) => digitNames[Number(d)] || d).join(" ");
    }
    return docSoTiengViet(Number(p1));
  });

  text = text.replace(/[₫]/g, " đồng");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function tachCauNho(text, maxLen = 140) {
  if (!text || text.length <= maxLen) return [text];
  const sentences = text.split(/([.,!?;\n]+)/);
  const chunks = [];
  let cur = "";

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if ((cur + part).length <= maxLen) {
      cur += part;
    } else {
      if (cur.trim()) chunks.push(cur.trim());
      if (part.length > maxLen) {
        const words = part.split(" ");
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).length <= maxLen) {
            sub += (sub ? " " : "") + w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) cur = sub;
        else cur = "";
      } else {
        cur = part;
      }
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter((c) => c.length > 0);
}

export function getVoiceSettings() {
  try {
    const raw = localStorage.getItem("ev_voice_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        voice: parsed.voice || "google_vi",
        rate: Number(parsed.rate) || 1.0,
        pitch: Number(parsed.pitch) || 1.0,
        autoSpeak: Boolean(parsed.autoSpeak),
      };
    }
  } catch (_) {}
  return {
    voice: "google_vi",
    rate: 1.0,
    pitch: 1.0,
    autoSpeak: false,
  };
}

export function saveVoiceSettings(settings) {
  try {
    localStorage.setItem("ev_voice_settings", JSON.stringify(settings));
  } catch (_) {}
}

export function getAvailableDeviceVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.filter((v) => {
    const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
    const name = (v.name || "").toLowerCase();
    if (lang === "vi-vn" || lang === "vi" || lang.startsWith("vi-")) {
      if (name.includes("english") || name.includes("david") || name.includes("zira") || name.includes("susan") || name.includes("mark")) {
        return false;
      }
      return true;
    }
    return (
      name.includes("vietnamese") ||
      name.includes("vietnam") ||
      name.includes("tiếng việt") ||
      name.includes("tieng viet") ||
      name.includes("hoaimy") ||
      name.includes("namminh")
    );
  });
}

export async function phatAmThanhGoogleTTS(text, options = {}) {
  if (typeof window === "undefined" || typeof Audio === "undefined") return false;

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
    currentAudio = null;
  }

  const chunks = tachCauNho(text, 120);
  if (!chunks.length) return false;

  try {
    for (const chunk of chunks) {
      let playedOk = false;

      // 1. SoundOfText Google Cloud TTS (giọng tiếng Việt Google chuẩn, có CORS header, âm thanh chất lượng cao)
      try {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch("https://api.soundoftext.com/sounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ engine: "Google", data: { text: chunk, voice: "vi-VN" } }),
          signal: controller.signal,
        });
        clearTimeout(fetchTimer);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.id) {
            const audioUrl = `https://files.soundoftext.com/${data.id}.mp3`;
            const audio = new Audio(audioUrl);
            currentAudio = audio;

            const ok = await new Promise((resolve) => {
              let done = false;
              const finish = (result) => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                resolve(result);
              };
              const timeout = setTimeout(() => finish(true), 8000);
              audio.onended = () => finish(true);
              audio.onerror = () => finish(false);
              audio.play().catch(() => finish(false));
            });

            if (ok) {
              playedOk = true;
            }
          }
        }
      } catch (_) {}

      // 2. Direct Google Translate TTS fallback
      if (!playedOk) {
        const encoded = encodeURIComponent(chunk);
        const audioSources = [
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encoded}`,
          `https://translate.google.com.vn/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encoded}`,
        ];

        for (const src of audioSources) {
          try {
            const audio = new Audio();
            currentAudio = audio;
            audio.src = src;

            const ok = await new Promise((resolve) => {
              const timeout = setTimeout(() => resolve(false), 3000);
              audio.onended = () => {
                clearTimeout(timeout);
                resolve(true);
              };
              audio.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
              };
              audio.play().catch(() => {
                clearTimeout(timeout);
                resolve(false);
              });
            });

            if (ok) {
              playedOk = true;
              break;
            }
          } catch (_) {
            continue;
          }
        }
      }

      if (!playedOk) return false;
    }
    return true;
  } catch (err) {
    console.warn("TTS Audio error:", err);
    return false;
  }
}

let cachedVnVoice = null;

function timGiongDocTiengViet(selectedVoiceURI = "") {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const isTrulyVietnamese = (v) => {
    if (!v) return false;
    const lang = (v.lang || "").toLowerCase().replace(/_/g, "-");
    const name = (v.name || "").toLowerCase();

    // 1. Phải có mã ngôn ngữ tiếng Việt (vi-VN, vi)
    if (lang === "vi-vn" || lang === "vi" || lang.startsWith("vi-")) {
      if (name.includes("english") || name.includes("david") || name.includes("zira") || name.includes("susan") || name.includes("mark")) {
        return false;
      }
      return true;
    }

    // 2. Hoặc tên chứa rõ ràng từ khóa tiếng Việt
    if (
      name.includes("vietnamese") ||
      name.includes("vietnam") ||
      name.includes("tiếng việt") ||
      name.includes("tieng viet") ||
      name.includes("hoaimy") ||
      name.includes("namminh")
    ) {
      return true;
    }

    return false;
  };

  if (selectedVoiceURI && selectedVoiceURI !== "device" && selectedVoiceURI !== "google_vi") {
    const matched = voices.find((v) => (v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI) && isTrulyVietnamese(v));
    if (matched) return matched;
  }

  // 1. Ưu tiên giọng vi-VN chuẩn của Google / Microsoft / Apple
  const exactVi = voices.find((v) => (v.lang === "vi-VN" || v.lang === "vi_VN" || v.lang === "vi") && isTrulyVietnamese(v));
  if (exactVi) return exactVi;

  // 2. Giọng có tên chứa từ khóa Tiếng Việt
  const nameVi = voices.find(isTrulyVietnamese);
  if (nameVi) return nameVi;

  return null;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVnVoice = timGiongDocTiengViet();
  };
}

export async function docLai(text, customOptions = {}) {
  const spokenText = chuanHoaLoiNoiTiengViet(text);
  const settings = { ...getVoiceSettings(), ...customOptions };
  const { TextToSpeech } = nativePlugins();

  // 1. Android Capacitor Native TTS (nếu có plugin native và hỗ trợ vi-VN)
  if (isNative() && TextToSpeech?.speak) {
    try {
      await TextToSpeech.speak({
        text: spokenText,
        lang: "vi-VN",
        rate: settings.rate || 0.95,
        pitch: settings.pitch || 1.0,
        volume: 1.0,
      });
      return;
    } catch (e) {
      console.warn("Native TTS error", e);
    }
  }

  // 2. Ưu tiên số 1: Giọng Google Cloud TTS tiếng Việt tự nhiên, trong trẻo, không bao giờ bị lai
  const played = await phatAmThanhGoogleTTS(spokenText, settings);
  if (played) return;

  // 3. Fallback: Device SpeechSynthesis (đảm bảo luôn phát âm thanh thay vì im lặng)
  if (typeof window !== "undefined" && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "vi-VN";
      const vnVoice = timGiongDocTiengViet(settings.deviceVoiceURI || "");
      if (vnVoice) {
        utterance.voice = vnVoice;
      }
      utterance.rate = settings.rate || 0.95;
      utterance.pitch = settings.pitch || 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis error:", err);
    }
  }
}


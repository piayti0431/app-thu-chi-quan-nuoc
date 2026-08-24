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

  // Replace symbols and common short forms
  text = text.replace(/\+\s*/g, "thu ");
  text = text.replace(/-\s*/g, "chi ");
  text = text.replace(/\b(ck|CK)\b/g, "chuyển khoản");
  text = text.replace(/\b(qr|QR)\b/g, "mã quy rờ");
  text = text.replace(/\b(cost|Cost)\b/g, "tiền vốn");
  text = text.replace(/\b(pos|POS)\b/g, "bán hàng");

  // Format currency with dots: "582.000 đ", "1.500.000 đồng"
  text = text.replace(/(\d{1,3}(?:\.\d{3})+)\s*(?:đ|dong|đồng)?/gi, (match, p1) => {
    const num = Number(p1.replace(/\./g, ""));
    return `${docSoTiengViet(num)} đồng`;
  });

  // Format "500k", "50k", "15k"
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

export async function phatAmThanhGoogleTTS(text) {
  if (typeof window === "undefined" || typeof Audio === "undefined") return false;

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
    currentAudio = null;
  }

  const chunks = tachCauNho(text, 140);
  if (!chunks.length) return false;

  try {
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const audio = new Audio(url);
      currentAudio = audio;

      await new Promise((resolve, reject) => {
        audio.onended = () => resolve(true);
        audio.onerror = (e) => reject(e);
        audio.play().catch((err) => reject(err));
      });
    }
    return true;
  } catch (err) {
    console.warn("Google TTS audio error, falling back to Web Speech", err);
    return false;
  }
}

let cachedVnVoice = null;

function timGiongDocTiengViet() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  // 1. Ưu tiên giọng vi-VN chuẩn
  const exactVi = voices.find((v) => v.lang === "vi-VN" || v.lang === "vi_VN");
  if (exactVi) return exactVi;

  // 2. Giọng bắt đầu bằng vi
  const anyVi = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("vi"));
  if (anyVi) return anyVi;

  // 3. Tên chứa từ khóa tiếng Việt
  const nameVi = voices.find((v) => {
    const n = (v.name || "").toLowerCase();
    return (
      n.includes("vietnam") ||
      n.includes("vietnamese") ||
      n.includes("tiếng việt") ||
      n.includes("hoaimy") ||
      n.includes("namminh") ||
      n.includes("linh") ||
      n.includes("mai") ||
      n.includes("an")
    );
  });
  if (nameVi) return nameVi;

  return null;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVnVoice = timGiongDocTiengViet();
  };
}

export async function docLai(text) {
  const spokenText = chuanHoaLoiNoiTiengViet(text);
  const { TextToSpeech } = nativePlugins();

  // 1. Android Capacitor Native TTS (has full Vietnamese language pack on phone)
  if (isNative() && TextToSpeech?.speak) {
    try {
      await TextToSpeech.speak({
        text: spokenText,
        lang: "vi-VN",
        rate: 0.92,
        pitch: 1.0,
        volume: 1.0,
      });
      return;
    } catch (e) {
      console.warn("Native TTS error", e);
    }
  }

  // 2. Google Vietnamese Neural TTS Audio (100% chuẩn dấu tiếng Việt)
  const played = await phatAmThanhGoogleTTS(spokenText);
  if (played) return;

  // 3. Fallback: Web SpeechSynthesis
  if (typeof window !== "undefined" && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const vnVoice = cachedVnVoice || timGiongDocTiengViet();
    if (vnVoice) {
      utterance.voice = vnVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

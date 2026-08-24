const THU_CATEGORY = "Nước mía thường";
const DEFAULT_NOTE = "";

export const DEFAULT_QUICK_ITEMS = [
  { id: "nuoc_mia", name: "Nước mía thường", category: "Nước mía thường", price: 8000, costPrice: 3000, voiceName: "nước mía", voiceUnit: "ly" },
  { id: "nuoc_mia_1l", name: "Nước mía 1 lít", category: "Nước mía 1 lít", price: 15000, costPrice: 6000, voiceName: "nước mía 1 lít", voiceUnit: "chai" },
  { id: "mia_cam", name: "Mía cam", category: "Mía cam", price: 15000, costPrice: 6000, voiceName: "mía cam", voiceUnit: "ly" },
  { id: "rau_ma", name: "Rau má tươi", category: "Rau má tươi", price: 10000, costPrice: 4000, voiceName: "rau má", voiceUnit: "ly" },
  { id: "rau_ma_sua", name: "Rau má sữa", category: "Rau má sữa", price: 15000, costPrice: 6000, voiceName: "rau má sữa", voiceUnit: "ly" },
  { id: "rau_ma_dau_xanh", name: "Rau má đậu xanh", category: "Rau má đậu xanh", price: 15000, costPrice: 6000, voiceName: "rau má đậu xanh", voiceUnit: "ly" },
  { id: "tra_tac", name: "Trà tắc", category: "Trà tắc", price: 15000, costPrice: 4000, voiceName: "trà tắc", voiceUnit: "ly" },
  { id: "nuoc_cam", name: "Nước cam", category: "Nước cam", price: 15000, costPrice: 7000, voiceName: "nước cam", voiceUnit: "ly" },
];

const DIGIT_WORDS = new Map([
  ["khong", 0],
  ["mot", 1],
  ["mots", 1],
  ["moi", 1],
  ["hai", 2],
  ["ba", 3],
  ["bon", 4],
  ["tu", 4],
  ["nam", 5],
  ["lam", 5],
  ["sau", 6],
  ["bay", 7],
  ["tam", 8],
  ["chin", 9],
]);

const UNITS = ["ly", "coc", "chai", "binh", "bo", "bao", "bich", "tui"];
const PRODUCT_UNITS = ["ly", "coc", "chai", "binh", "bich"];
const MONEY_UNITS = new Set(["k", "nghin", "ngan", "trieu", "chuc"]);
const LITER_WORDS = new Set(["lit", "lich", "lid", "liet", "let", "l", "litre", "liter"]);
const MIA_WORDS = new Set(["mia", "mi", "miaa", "mya"]);
const CAM_WORDS = new Set(["cam", "camm", "can", "cang", "kam", "camtuoi"]);
const NUOC_WORDS = new Set(["nuoc", "nuot", "nuotc", "nuocm", "nuc"]);
const NUMBER_FILLERS = new Set(["linh", "le"]);

export function stripWakeWordAndBranch(text) {
  let raw = String(text || "").trim();

  // Strip EV / i vi / ê vi / evi wake words at the beginning or standalone
  raw = raw.replace(/^(ev|i\s*vi|e\s*vi|i-vi|e-vi|ê\s*vi|ê-vi|evi)(\s+ơi|\s+oi|\s+nhe|\s+nhé|\s+giúp|\s+giup|\s+cho)?\s+/i, "");
  raw = raw.replace(/\b(ev|i\s*vi|e\s*vi|i-vi|e-vi|ê\s*vi|ê-vi|evi)\b/gi, "").replace(/\s+/g, " ").trim();

  // Detect explicit branch in voice (support both accented and unaccented)
  let branch = null;
  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");

  if (/chi\s*nhanh\s*2|quan\s*2|diem\s*ban\s*2/i.test(norm)) {
    branch = "Chi nhánh 2";
    raw = raw.replace(/chi\s*nh[aáàảãạ]nh\s*2|qu[aáàảãạ]n\s*2|di[eéèẻẽẹêếềểễệ]m\s*b[aáàảãạ]n\s*2/gi, "").trim();
  } else if (/chi\s*nhanh\s*1|quan\s*1|quan\s*nha|chinh/i.test(norm)) {
    branch = "Quán Nhà (Chính)";
    raw = raw.replace(/chi\s*nh[aáàảãạ]nh\s*1|qu[aáàảãạ]n\s*1|qu[aáàảãạ]n\s*nh[aàảãạ]|ch[iíìỉĩị]nh/gi, "").trim();
  }

  return { cleanText: raw, branch };
}

function normalizeText(text) {
  const { cleanText } = stripWakeWordAndBranch(text);
  return String(cleanText || text || "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized) {
  return normalized ? normalized.split(" ") : [];
}

function editDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}

function tokenMatches(token, words) {
  if (words.has(token)) return true;
  return [...words].some(
    (word) => word.length >= 3 && token[0] === word[0] && editDistance(token, word) <= 1,
  );
}

function hasToken(tokens, words) {
  return tokens.some((token) => tokenMatches(token, words));
}

function parseNumeric(value) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function isDigitToken(token) {
  return /^\d+(?:[\.,]\d+)?$/.test(token) || DIGIT_WORDS.has(token);
}

function isNumberToken(token) {
  return isDigitToken(token) || token === "muoi" || token === "chuc" || token === "tram" || NUMBER_FILLERS.has(token);
}

function tokenNumber(token) {
  if (/^\d+(?:[\.,]\d+)?$/.test(token)) return parseNumeric(token);
  return DIGIT_WORDS.get(token) ?? 0;
}

function numberPhraseBefore(tokens, index, maxWords = 6) {
  const phrase = [];
  for (let cursor = index - 1; cursor >= 0 && phrase.length < maxWords; cursor -= 1) {
    if (!isNumberToken(tokens[cursor])) break;
    phrase.unshift(tokens[cursor]);
  }
  return phrase;
}

function numberPhraseAfter(tokens, index, maxWords = 6) {
  const phrase = [];
  for (let cursor = index + 1; cursor < tokens.length && phrase.length < maxWords; cursor += 1) {
    if (!isNumberToken(tokens[cursor])) break;
    phrase.push(tokens[cursor]);
  }
  return phrase;
}

function parseVietnameseNumber(words) {
  const tokens = words.filter(Boolean);
  if (!tokens.length) return 0;
  if (tokens.length === 1 && /^\d+(?:[\.,]\d+)?$/.test(tokens[0])) return parseNumeric(tokens[0]);

  let total = 0;
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (/^\d+(?:[\.,]\d+)?$/.test(token)) {
      total += parseNumeric(token);
      i += 1;
      continue;
    }

    if (next === "tram") {
      total += tokenNumber(token) * 100;
      i += 2;
      continue;
    }

    if (token === "tram") {
      total += 100;
      i += 1;
      continue;
    }

    if (next === "muoi" || next === "chuc") {
      total += tokenNumber(token) * 10;
      i += 2;
      continue;
    }

    if (token === "muoi" || token === "chuc") {
      total += 10;
      i += 1;
      continue;
    }

    if (NUMBER_FILLERS.has(token)) {
      i += 1;
      continue;
    }

    total += tokenNumber(token);
    i += 1;
  }

  return total;
}

function detectType(normalized) {
  const expenseHints = [
    "mua",
    "tra tien",
    "tien dien",
    "tien nuoc",
    "do xang",
    "xang",
    "da cay",
    "ong hut",
    "tui",
    "nhap",
    "chi",
    "het",
  ];
  if (expenseHints.some((hint) => normalized.includes(hint))) return "chi";

  const incomeHints = ["ban", "thu", "khach", "duoc", "lay", "cho khach"];
  if (incomeHints.some((hint) => normalized.includes(hint))) return "thu";

  return "thu";
}

function findQuickItem(quickItems, id, fallbackIndex) {
  const fallback = DEFAULT_QUICK_ITEMS[fallbackIndex] || DEFAULT_QUICK_ITEMS[0];
  const found = quickItems.find((item) => item.id === id);
  return {
    ...fallback,
    ...(found || {}),
    price: Number(found?.price) > 0 ? Number(found.price) : fallback.price,
    costPrice: Number(found?.costPrice) >= 0 ? Number(found.costPrice) : fallback.costPrice,
  };
}

function hasLiterHint(normalized, tokens) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (!tokenMatches(tokens[index], LITER_WORDS) && tokens[index] !== "it") continue;
    const previous = tokens[index - 1];
    if (previous === "1" || previous === "mot") return true;
  }
  return (
    normalized.includes("1l") ||
    normalized.includes("mia lit") ||
    normalized.includes("mia lich") ||
    normalized.includes("mia lid") ||
    normalized.includes("1 it") ||
    normalized.includes("mot it") ||
    normalized.includes("chai mia")
  );
}

function quantityNearUnit(tokens, units) {
  for (const unit of units) {
    const indexes = tokens.flatMap((token, index) => (token === unit ? [index] : []));
    for (const index of indexes) {
      const before = parseVietnameseNumber(numberPhraseBefore(tokens, index, 4));
      if (before > 0) return { quantity: before, unit };

      const after = parseVietnameseNumber(numberPhraseAfter(tokens, index, 4));
      if (after > 0) return { quantity: after, unit };
    }
  }
  return null;
}

function leadingQuantity(tokens) {
  const phrase = [];
  for (const token of tokens) {
    if (!isNumberToken(token)) break;
    phrase.push(token);
  }
  if (!phrase.length) return 0;
  const next = tokens[phrase.length];
  if (MONEY_UNITS.has(next) || next === "trieu") return 0;
  return parseVietnameseNumber(phrase);
}

function productQuantity(tokens, product) {
  const unitHit = quantityNearUnit(tokens, PRODUCT_UNITS);
  if (unitHit) {
    return {
      quantity: unitHit.quantity,
      spokenUnit: unitHit.unit,
      unit: product.id === "nuoc_mia_1l" ? "chai" : (product.voiceUnit || "ly"),
    };
  }

  return {
    quantity: leadingQuantity(tokens) || 1,
    spokenUnit: "",
    unit: product.voiceUnit || "ly",
  };
}

function productCandidates(normalized, tokens, quickItems = DEFAULT_QUICK_ITEMS) {
  const hasMia = normalized.includes("mia") || hasToken(tokens, MIA_WORDS);
  const hasCam = normalized.includes("cam") || hasToken(tokens, CAM_WORDS);
  const hasRauMa = normalized.includes("rau ma") || normalized.includes("ma") || normalized.includes("rauma");
  const hasDauXanh = normalized.includes("dau xanh") || normalized.includes("dau") || normalized.includes("dauxanh");
  const hasSua = normalized.includes("sua");
  const hasTac = normalized.includes("tac") || normalized.includes("quat") || normalized.includes("tra tac");
  const hasNuoc = normalized.includes("nuoc") || hasToken(tokens, NUOC_WORDS);
  const hasOneLiter = hasLiterHint(normalized, tokens);

  const productList = [
    findQuickItem(quickItems, "rau_ma_dau_xanh", 5),
    findQuickItem(quickItems, "rau_ma_sua", 4),
    findQuickItem(quickItems, "rau_ma", 3),
    findQuickItem(quickItems, "tra_tac", 6),
    findQuickItem(quickItems, "mia_cam", 2),
    findQuickItem(quickItems, "nuoc_cam", 7),
    findQuickItem(quickItems, "nuoc_mia_1l", 1),
    findQuickItem(quickItems, "nuoc_mia", 0),
  ];

  const candidates = [];
  for (const item of productList) {
    let score = 0;
    const reasons = [];

    if (item.id === "rau_ma_dau_xanh" && (normalized.includes("dau xanh") || (hasRauMa && hasDauXanh) || normalized.includes("ma dau"))) {
      score += 100;
      reasons.push("có từ rau má đậu xanh");
    } else if (item.id === "rau_ma_sua" && (normalized.includes("rau ma sua") || normalized.includes("ma sua") || (hasRauMa && hasSua))) {
      score += 98;
      reasons.push("có từ rau má sữa");
    } else if (item.id === "rau_ma" && (normalized.includes("rau ma") || normalized.includes("ma tuoi") || (hasRauMa && !hasDauXanh && !hasSua))) {
      score += 85;
      reasons.push("có từ rau má");
    } else if (item.id === "tra_tac" && (hasTac || normalized.includes("tra tac") || normalized.includes("tra quat"))) {
      score += 90;
      reasons.push("có từ trà tắc");
    } else if (item.id === "mia_cam" && hasMia && hasCam) {
      score += 95;
      reasons.push("có mía cam");
    } else if (item.id === "nuoc_cam" && hasCam && !hasMia) {
      score += 85;
      reasons.push("có từ cam");
      if (normalized.includes("cam tuoi")) score += 8;
    } else if (item.id === "nuoc_mia_1l" && hasMia && hasOneLiter) {
      score += 95;
      reasons.push("có mía và dấu hiệu 1 lít");
    } else if (item.id === "nuoc_mia" && hasMia && !hasOneLiter && !hasCam) {
      score += 80;
      reasons.push("có từ mía");
      if (normalized.includes("mia tac") || normalized.includes("mia thom")) score += 10;
    }

    if (score <= 0) continue;
    if (hasNuoc) score += 3;

    const quantity = productQuantity(tokens, item);
    candidates.push({
      id: item.id,
      name: item.voiceName || item.name,
      unit: quantity.unit,
      spokenUnit: quantity.spokenUnit,
      category: item.category || item.name,
      price: Number(item.price) || 0,
      costPrice: Number(item.costPrice) || 0,
      quantity: quantity.quantity,
      score,
      reasons,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function detectProduct(normalized, tokens, quickItems = DEFAULT_QUICK_ITEMS) {
  return productCandidates(normalized, tokens, quickItems)[0] || null;
}

function detectCategory(normalized, type, product) {
  if (type === "thu") return product?.category || THU_CATEGORY;
  if (normalized.includes("cam")) return "Cam tươi";
  if (normalized.includes("rau ma") || normalized.includes("ma tuoi")) return "Rau má tươi";
  if (normalized.includes("sua dac") || normalized.includes("sua")) return "Sữa đặc";
  if (normalized.includes("dau xanh") || normalized.includes("dau")) return "Đậu xanh";
  if (normalized.includes("tac") || normalized.includes("quat")) return "Tắc tươi (Quất)";
  if (normalized.includes("duong")) return "Đường cát";
  if (normalized.includes("mia")) return "Mua mía";
  if (normalized.includes("da")) return "Mua đá";
  if (normalized.includes("ong hut") || normalized.includes("ly") || normalized.includes("tui") || normalized.includes("boc") || normalized.includes("nap") || normalized.includes("bao bi")) {
    return "Ly/ống hút/túi";
  }
  if (normalized.includes("dien") || normalized.includes("nuoc")) return "Điện nước";
  if (normalized.includes("xang")) return "Xăng xe";
  return "Chi khác";
}

function moneyPhraseBefore(tokens, index) {
  const phrase = numberPhraseBefore(tokens, index, 7);
  return phrase.length ? phrase : [];
}

function parseExplicitMoney(normalized, tokens) {
  const numberWord = "(\\d+(?:[\\.,]\\d+)?)";
  const unitPattern = new RegExp(`${numberWord}\\s*(trieu|nghin|ngan|k)\\b(?:\\s*ruoi\\b)?`, "g");
  const matches = [...normalized.matchAll(unitPattern)];
  if (matches.length) {
    const match = matches[matches.length - 1];
    const rawNumber = parseNumeric(match[1]);
    const unit = match[2];
    const hasHalf = /\bruoi\b/.test(match[0]);
    if (unit === "trieu") return Math.round(rawNumber * 1000000 + (hasHalf ? 500000 : 0));
    return Math.round(rawNumber * 1000 + (hasHalf ? 500 : 0));
  }

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const unit = tokens[index];
    if (!MONEY_UNITS.has(unit)) continue;
    const amount = parseVietnameseNumber(moneyPhraseBefore(tokens, index));
    if (amount <= 0) continue;
    if (unit === "trieu") return Math.round(amount * 1000000 + (tokens[index + 1] === "ruoi" ? 500000 : 0));
    if (unit === "chuc") return Math.round(amount * 10000);
    return Math.round(amount * 1000);
  }

  return 0;
}

function trailingNumberPhrase(tokens) {
  const phrase = [];
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (!isNumberToken(token)) break;
    phrase.unshift(token);
  }
  return phrase;
}

function parseLooseMoney(normalized, tokens) {
  // Loại bỏ các con số đứng liền trước đơn vị tính hàng hóa (ví dụ: "2 bao", "3 ly", "5 kg") để không bị hiểu nhầm thành tiền lẻ
  const cleanForLooseMoney = normalized.replace(
    /\b(\d+(?:[\.,]\d+)?)\s*(?:bao|bo|bó|ly|coc|cốc|chai|binh|bình|kg|ky|boc|bọc|tui|túi|hop|hộp|lon|thung|thùng|lit|lít)\b/gi,
    ""
  );

  const looseNumbers = cleanForLooseMoney.match(/\d+(?:[\.,]\d+)?/g);
  if (looseNumbers && looseNumbers.length > 0) {
    const value = parseNumeric(looseNumbers[looseNumbers.length - 1]);
    if (Number.isFinite(value) && value > 1) return Math.round(value < 1000 ? value * 1000 : value);
  }

  const phrase = trailingNumberPhrase(tokens);
  const lastToken = tokens[tokens.length - 1];
  const NON_MONEY_UNITS = new Set([
    "bao",
    "bo",
    "ly",
    "coc",
    "chai",
    "binh",
    "kg",
    "ky",
    "boc",
    "tui",
    "hop",
    "lon",
    "thung",
    "lit",
    "da",
    "mia",
    "cam",
  ]);
  if (!NON_MONEY_UNITS.has(lastToken)) {
    const value = parseVietnameseNumber(phrase);
    if (value > 1) return Math.round(value < 1000 ? value * 1000 : value);
  }
  return 0;
}

function detectPriceMode(normalized, explicitMoney, product) {
  if (!explicitMoney) return product ? "auto" : "missing";
  if (/\b(moi|don gia|gia moi|moi ly|moi chai)\b/.test(normalized)) return "unit";
  if (/\b(tong|thanh tien|tat ca|cong|het|thu duoc)\b/.test(normalized)) return "total";
  if (product?.quantity > 1) {
    if (explicitMoney <= Math.max(product.price * 1.6, 25000) && explicitMoney <= product.price * product.quantity * 0.75) {
      return "unit";
    }
  }
  return "total";
}

function hasMoneyMarker(normalized) {
  return /\b(tong|thanh tien|tat ca|cong|het|thu duoc|gia|moi|don gia)\b/.test(normalized);
}

function parseMoney(normalized, tokens, type, product) {
  const explicitUnitMoney = parseExplicitMoney(normalized, tokens);
  const canUseLooseMoney = type === "chi" || hasMoneyMarker(normalized);
  const explicitMoney = explicitUnitMoney || (canUseLooseMoney ? parseLooseMoney(normalized, tokens) : 0);
  const priceMode = detectPriceMode(normalized, explicitMoney, product);

  if (explicitMoney > 0) {
    // Tự động suy luận số lượng món dựa theo đơn giá trên Menu
    // Ví dụ: "khách chuyển khoản 100k trà tắc" -> tự suy ra 10 ly
    if (type === "thu" && product && !product.spokenUnit) {
      if (product.price > 0 && explicitMoney > product.price && explicitMoney % product.price === 0) {
        product.quantity = Math.round(explicitMoney / product.price);
        return { amount: explicitMoney, priceMode: "total", explicitMoney };
      }
      if (explicitMoney >= 50000 && explicitMoney % 10000 === 0) {
        product.quantity = Math.round(explicitMoney / 10000);
        return { amount: explicitMoney, priceMode: "total", explicitMoney };
      }
    }

    if (type === "thu" && product?.quantity > 1 && priceMode === "unit") {
      return { amount: Math.round(explicitMoney * product.quantity), priceMode, explicitMoney };
    }
    return { amount: explicitMoney, priceMode, explicitMoney };
  }

  if (type === "thu" && product) {
    return { amount: Math.round(product.price * product.quantity), priceMode: "auto", explicitMoney: 0 };
  }

  return { amount: 0, priceMode: "missing", explicitMoney: 0 };
}

function describeTransaction(type, normalized, product, category) {
  if (type === "thu" && product) {
    return `bán ${product.quantity} ${product.unit} ${product.name}`;
  }

  if (category === "Mua mía" || category === "Mía cây") return "mua mía";
  if (category === "Mua đá" || category === "Tiền đá") return "mua đá";
  if (category === "Cam tươi") return "mua cam";
  if (category === "Rau má tươi") return "mua rau má";
  if (category === "Sữa đặc") return "mua sữa";
  if (category === "Đậu xanh") return "mua đậu xanh";
  if (category === "Tắc tươi (Quất)") return "mua tắc";
  if (category === "Đường cát") return "mua đường";
  if (category === "Ly/ống hút/túi" || category === "Ly/ống hút/bao bì") {
    if (normalized.includes("ong hut")) return "mua ống hút";
    if (normalized.includes("tui") || normalized.includes("boc")) return "mua túi";
    return "mua ly, ống hút hoặc túi";
  }
  if (category === "Điện nước") {
    if (normalized.includes("dien")) return "trả tiền điện";
    if (normalized.includes("nuoc")) return "trả tiền nước";
    return "trả tiền điện nước";
  }
  if (category === "Xăng xe") return "đổ xăng";
  return category.toLowerCase();
}

function confidenceLevel({ product, amount, explicitMoney, priceMode, category, type }) {
  let score = 0;
  if (type === "thu" && product) score += 45;
  if (type === "chi" && category !== "Chi khác") score += 35;
  if (amount > 0) score += 30;
  if (explicitMoney > 0) score += 12;
  if (priceMode === "auto") score += 8;
  if (priceMode === "unit" || priceMode === "total") score += 10;
  if (type === "chi" && category === "Chi khác" && amount === 0) score -= 20;
  if (type === "thu" && product && explicitMoney > 0 && priceMode === "total") {
    const expected = product.price * product.quantity;
    if (expected > 0 && Math.abs(amount - expected) >= Math.max(1000, product.price * 0.2)) score -= 28;
  }

  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function detectExpenseUnitAndQuantity(normalized, tokens, category) {
  const expenseUnits = ["kg", "ky", "bao", "bo", "lon", "chai", "binh", "bich", "tui", "ly", "coc", "hop", "thung", "lit"];
  const unitHit = quantityNearUnit(tokens, expenseUnits);
  if (unitHit) {
    let u = unitHit.unit;
    if (u === "ky") u = "kg";
    if (u === "bo") u = "bó";
    if (u === "coc") u = "ly";
    return { quantity: unitHit.quantity, unit: u };
  }

  const kgMatch = normalized.match(/(\d+(?:[\.,]\d+)?)\s*(?:kg|ky)\b/);
  if (kgMatch) {
    return { quantity: parseNumeric(kgMatch[1]), unit: "kg" };
  }

  let defaultUnit = "lần";
  if (category === "Mua mía" || category === "Mía cây") defaultUnit = "bó";
  else if (category === "Mua đá" || category === "Tiền đá") defaultUnit = "bao";
  else if (category === "Sữa đặc") defaultUnit = "lon";
  else if (category === "Cam tươi" || category === "Rau má tươi" || category === "Đậu xanh" || category === "Đường cát" || category === "Tắc tươi (Quất)") defaultUnit = "kg";
  else if (category === "Ly/ống hút/túi" || category === "Ly/ống hút/bao bì") defaultUnit = "bọc";

  const leadQty = leadingQuantity(tokens) || 1;
  return { quantity: leadQty, unit: defaultUnit };
}

function detectPaymentMethod(normalized) {
  if (
    normalized.includes("chuyen khoan") ||
    normalized.includes("chuyen") ||
    normalized.includes("ck") ||
    normalized.includes("quet ma") ||
    normalized.includes("qr") ||
    normalized.includes("momo") ||
    normalized.includes("banking") ||
    normalized.includes("tai khoan")
  ) {
    return "chuyen_khoan";
  }
  return "tien_mat";
}

export function phanTichChiTiet(text, quickItems = DEFAULT_QUICK_ITEMS) {
  const { cleanText, branch } = stripWakeWordAndBranch(text);
  const normalized = normalizeText(cleanText || text);
  const tokens = tokenize(normalized);
  const loai = detectType(normalized);
  const alternatives = productCandidates(normalized, tokens, quickItems);
  const product = loai === "thu" ? detectProduct(normalized, tokens, quickItems) : null;
  const category = detectCategory(normalized, loai, product);
  const money = parseMoney(normalized, tokens, loai, product);
  const moTaXacNhan = describeTransaction(loai, normalized, product, category);
  const confidence = confidenceLevel({
    product,
    amount: money.amount,
    explicitMoney: money.explicitMoney,
    priceMode: money.priceMode,
    category,
    type: loai,
  });

  let qty = 1;
  let unit = "ly";
  if (loai === "thu") {
    qty = product?.quantity || 1;
    unit = product?.unit || (product?.id === "nuoc_mia_1l" ? "chai" : "ly");
  } else {
    const expenseInfo = detectExpenseUnitAndQuantity(normalized, tokens, category);
    qty = expenseInfo.quantity;
    unit = expenseInfo.unit;
  }

  const unitCost = Number(product?.costPrice) >= 0 ? Number(product.costPrice) : 0;
  const totalCost = loai === "thu" ? qty * unitCost : 0;
  const phuongThuc = detectPaymentMethod(normalized);

  return {
    loai,
    soTien: money.amount,
    soLuong: qty,
    donViTinh: unit,
    phuongThuc,
    giaCostDonVi: unitCost,
    tongGiaCost: totalCost,
    danhMuc: category,
    chiNhanh: branch || null,
    moTaXacNhan,
    ghiChu: text?.trim() || DEFAULT_NOTE,
    cauNoiGoc: text?.trim() || "",
    confidence,
    tokens,
    slots: {
      type: loai,
      productId: product?.id || null,
      productName: product?.name || "",
      quantity: qty,
      unit: product?.unit || "",
      spokenUnit: product?.spokenUnit || "",
      unitPrice: product?.price || 0,
      costPrice: unitCost,
      explicitMoney: money.explicitMoney,
      priceMode: money.priceMode,
    },
    alternatives: alternatives.map((item) => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      score: item.score,
      reasons: item.reasons,
    })),
  };
}

function splitBatchSegments(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const normalized = normalizeText(raw);
  const hasBatchSeparator = /[,;]|\s(?:va|voi|roi|cong them|them)\s/.test(normalized);
  if (!hasBatchSeparator) return [raw];

  return raw
    .split(/[,;]|\s+(?:và|va|với|voi|rồi|roi|cộng thêm|cong them|thêm|them)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function batchSummary(items) {
  return items.map((item) => item.moTaXacNhan || item.danhMuc).join(", ");
}

export function phanTichNhieu(text, quickItems = DEFAULT_QUICK_ITEMS) {
  const segments = splitBatchSegments(text);
  const items = segments
    .map((segment) => phanTichChiTiet(segment, quickItems))
    .filter((item) => item.soTien > 0 || item.confidence !== "low");

  if (items.length <= 1) {
    const single = items[0] || phanTichChiTiet(text, quickItems);
    return {
      isBatch: false,
      items: [single],
      total: single.soTien || 0,
      loai: single.loai,
      soTien: single.soTien,
      soLuong: single.soLuong || 1,
      giaCostDonVi: single.giaCostDonVi || 0,
      tongGiaCost: single.tongGiaCost || 0,
      danhMuc: single.danhMuc,
      moTaXacNhan: single.moTaXacNhan,
      ghiChu: single.ghiChu,
      cauNoiGoc: single.cauNoiGoc,
      confidence: single.confidence,
      tokens: single.tokens,
      slots: single.slots,
      alternatives: single.alternatives,
    };
  }

  const total = items.reduce((sum, item) => sum + Number(item.soTien || 0), 0);
  const totalCost = items.reduce((sum, item) => sum + Number(item.tongGiaCost || 0), 0);
  const type = items.every((item) => item.loai === "chi") ? "chi" : "thu";

  return {
    isBatch: true,
    items,
    total,
    loai: type,
    soTien: total,
    soLuong: items.reduce((sum, item) => sum + Number(item.soLuong || 1), 0),
    giaCostDonVi: 0,
    tongGiaCost: totalCost,
    danhMuc: type === "thu" ? "Tổng nhiều món" : "Chi khác",
    moTaXacNhan: batchSummary(items),
    ghiChu: text?.trim() || DEFAULT_NOTE,
    cauNoiGoc: text?.trim() || "",
    confidence: items.every((item) => item.confidence === "high") ? "high" : "medium",
    tokens: tokenize(normalizeText(text)),
    slots: {
      type,
      count: items.length,
      total,
      totalCost,
    },
    alternatives: [],
  };
}

export function phanTich(text, quickItems = DEFAULT_QUICK_ITEMS) {
  return phanTichChiTiet(text, quickItems);
}

export const parserTestCases = [
  ["bán 2 ly 40 nghìn", "thu", 40000, "Nước mía thường"],
  ["ban 2 ly 40 nghin", "thu", 40000, "Nước mía thường"],
  ["bán nước mía 20 nghìn", "thu", 20000, "Nước mía thường"],
  ["khách trả 50 ngàn", "thu", 50000, "Nước mía thường"],
  ["1 ly nước mía 10k", "thu", 10000, "Nước mía thường"],
  ["1 ly nước mía 10 nghìn", "thu", 10000, "Nước mía thường"],
  ["1 ly nước mía 10 ngàn", "thu", 10000, "Nước mía thường"],
  ["1 ly nước mía mười nghìn", "thu", 10000, "Nước mía thường"],
  ["một ly nước mía mười ngàn", "thu", 10000, "Nước mía thường"],
  ["2 ly nước mía", "thu", 16000, "Nước mía thường"],
  ["3 ly nước mía", "thu", 24000, "Nước mía thường"],
  ["2 ly nước mía 10k", "thu", 20000, "Nước mía thường"],
  ["3 ly nước mía 10k", "thu", 30000, "Nước mía thường"],
  ["3 ly nước mía mỗi ly 10k", "thu", 30000, "Nước mía thường"],
  ["3 ly nước mía 30k", "thu", 30000, "Nước mía thường"],
  ["3 ly nước mía 25k", "thu", 25000, "Nước mía thường"],
  ["nước cam mười lăm nghìn", "thu", 15000, "Nước cam"],
  ["2 ly nước cam 15k", "thu", 30000, "Nước cam"],
  ["nước mía 1 lít 16k", "thu", 16000, "Nước mía 1 lít"],
  ["mua mía 200k", "chi", 200000, "Mua mía"],
  ["mua 5 bó mía 150 nghìn", "chi", 150000, "Mua mía"],
  ["trả tiền đá 30 nghìn", "chi", 30000, "Mua đá"],
  ["tiền điện 1 triệu rưỡi", "chi", 1500000, "Điện nước"],
  ["đổ xăng 50", "chi", 50000, "Xăng xe"],
  ["mua ống hút 25 nghìn", "chi", 25000, "Ly/ống hút/túi"],
];

export function chayTest(items = DEFAULT_QUICK_ITEMS) {
  return parserTestCases.map(([text, loai, soTien, danhMuc]) => {
    const actual = phanTich(text, items);
    return {
      text,
      pass: actual.loai === loai && actual.soTien === soTien && actual.danhMuc === danhMuc,
      expected: { loai, soTien, danhMuc },
      actual,
    };
  });
}

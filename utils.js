(function (global) {
  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, "")
      .replace(/[\p{P}\p{S}]/gu, "")
      .toLowerCase()
      .trim();
  }

  function toBigrams(value) {
    const source = ` ${normalizeText(value)} `;
    if (source.length < 2) {
      return [];
    }

    const grams = [];
    for (let index = 0; index < source.length - 1; index += 1) {
      grams.push(source.slice(index, index + 2));
    }
    return grams;
  }

  function similarity(left, right) {
    const a = toBigrams(left);
    const b = toBigrams(right);

    if (!a.length || !b.length) {
      return 0;
    }

    const counts = new Map();
    for (const gram of a) {
      counts.set(gram, (counts.get(gram) || 0) + 1);
    }

    let overlap = 0;
    for (const gram of b) {
      const remaining = counts.get(gram) || 0;
      if (remaining > 0) {
        overlap += 1;
        counts.set(gram, remaining - 1);
      }
    }

    return (2 * overlap) / (a.length + b.length);
  }

  function splitMultiValue(value) {
    return String(value || "")
      .split(/[\r\n,，、;；|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function safeJsonParse(text, fallback) {
    if (!String(text || "").trim()) {
      return fallback;
    }

    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function parseSpreadsheetId(input) {
    const raw = String(input || "").trim();
    if (!raw) {
      return "";
    }

    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : raw;
  }

  function getGoogleFormsPageInfo(url) {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) {
      return {
        isForms: false,
        isFillable: false,
        type: "unknown"
      };
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return {
        isForms: false,
        isFillable: false,
        type: "unknown"
      };
    }

    const isGoogleFormsHost =
      parsed.hostname === "docs.google.com" && parsed.pathname.startsWith("/forms/");

    if (!isGoogleFormsHost) {
      return {
        isForms: false,
        isFillable: false,
        type: "unknown"
      };
    }

    const path = parsed.pathname;
    const isFillable =
      /\/viewform(?:\/|$)/.test(path) ||
      /\/prefill(?:\/|$)/.test(path) ||
      /\/formResponse(?:\/|$)/.test(path);

    if (isFillable) {
      return {
        isForms: true,
        isFillable: true,
        type: "fillable"
      };
    }

    if (/\/edit(?:\/|$)/.test(path)) {
      return {
        isForms: true,
        isFillable: false,
        type: "editor"
      };
    }

    if (/\/viewanalytics(?:\/|$)/.test(path) || /\/responses(?:\/|$)/.test(path)) {
      return {
        isForms: true,
        isFillable: false,
        type: "responses"
      };
    }

    return {
      isForms: true,
      isFillable: false,
      type: "other"
    };
  }

  function detectDisplayColumns(headers, configuredFields) {
    const headerList = Array.isArray(headers) ? headers.filter(Boolean) : [];
    const fromConfig = splitMultiValue(configuredFields).flatMap((field) =>
      headerList.filter((header) => header.includes(field) || field.includes(header))
    );

    if (fromConfig.length) {
      return [...new Set(fromConfig)].slice(0, 4);
    }

    const keywords = [
      "Timestamp",
      "時間戳記",
      "姓名",
      "名字",
      "Email",
      "E-mail",
      "信箱",
      "網址",
      "URL",
      "Game Code",
      "代碼",
      "編號"
    ];
    const detected = [];
    for (const keyword of keywords) {
      const matched = headerList.find((header) => header.includes(keyword));
      if (matched) {
        detected.push(matched);
      }
    }

    return [...new Set(detected)].slice(0, 4);
  }

  function buildSearchText(record) {
    return Object.values(record || {}).join(" ");
  }

  function findBestHeaderMatch(questionTitle, headers, overrides) {
    const headerList = Array.isArray(headers) ? headers.filter(Boolean) : [];
    if (!questionTitle || !headerList.length) {
      return null;
    }

    const normalizedQuestion = normalizeText(questionTitle);
    const overrideEntries = Object.entries(overrides || {});
    const override = overrideEntries.find(([question]) => normalizeText(question) === normalizedQuestion);
    if (override) {
      const matchedHeader =
        headerList.find((header) => normalizeText(header) === normalizeText(override[1])) || override[1];
      return {
        header: matchedHeader,
        score: 1
      };
    }

    let best = null;
    for (const header of headerList) {
      const normalizedHeader = normalizeText(header);
      let score = 0;

      if (!normalizedHeader) {
        continue;
      }

      if (normalizedHeader === normalizedQuestion) {
        score = 1;
      } else if (
        normalizedHeader.includes(normalizedQuestion) ||
        normalizedQuestion.includes(normalizedHeader)
      ) {
        score = 0.92;
      } else {
        score = similarity(header, questionTitle);
      }

      if (!best || score > best.score) {
        best = {
          header,
          score
        };
      }
    }

    return best && best.score >= 0.55 ? best : null;
  }

  function formatPreviewValue(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeDateValue(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const slashMatch = raw.match(/^(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{1,4})$/);
    if (!slashMatch) {
      return raw;
    }

    let year;
    let month;
    let day;

    const first = Number.parseInt(slashMatch[1], 10);
    const second = Number.parseInt(slashMatch[2], 10);
    const third = Number.parseInt(slashMatch[3], 10);

    if (slashMatch[1].length === 4) {
      year = first;
      month = second;
      day = third;
    } else if (slashMatch[3].length === 4) {
      year = third;

      if (first > 12 && second <= 12) {
        day = first;
        month = second;
      } else {
        month = first;
        day = second;
      }
    } else {
      return raw;
    }

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return raw;
    }

    return `${year}-${padNumber(month)}-${padNumber(day)}`;
  }

  global.FormFillerUtils = {
    buildSearchText,
    detectDisplayColumns,
    findBestHeaderMatch,
    formatPreviewValue,
    getGoogleFormsPageInfo,
    normalizeDateValue,
    normalizeText,
    parseSpreadsheetId,
    safeJsonParse,
    similarity,
    splitMultiValue
  };
})(typeof self !== "undefined" ? self : window);

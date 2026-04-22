importScripts("utils.js");

const DEFAULT_SETTINGS = {
  spreadsheetId: "",
  sheetName: "Form Responses 1",
  searchFields: "Timestamp, 姓名, Email",
  mappingOverrides: "{}"
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await storageGet(DEFAULT_SETTINGS);
  await storageSet({
    ...DEFAULT_SETTINGS,
    ...stored
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((payload) => sendResponse(payload))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });

  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "settings:get":
      return {
        ok: true,
        settings: await getSettings()
      };

    case "settings:save":
      return {
        ok: true,
        settings: await saveSettings(message.payload || {})
      };

    case "auth:signIn":
      return {
        ok: true,
        profile: await signIn()
      };

    case "auth:signOut":
      await signOut();
      return {
        ok: true
      };

    case "records:fetch":
      return {
        ok: true,
        ...(await fetchRecords(Boolean(message.forceInteractive)))
      };

    case "sheets:list":
      return {
        ok: true,
        sheets: await fetchSheetList(message.spreadsheetId, Boolean(message.forceInteractive))
      };

    default:
      return {
        ok: false,
        error: "Unsupported message type."
      };
  }
}

async function getSettings() {
  const stored = await storageGet(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    spreadsheetId: FormFillerUtils.parseSpreadsheetId(stored.spreadsheetId)
  };
}

async function saveSettings(input) {
  const normalizedOverrides =
    typeof input.mappingOverrides === "string"
      ? input.mappingOverrides
      : JSON.stringify(input.mappingOverrides || {}, null, 2);

  const nextSettings = {
    ...(await getSettings()),
    ...input,
    mappingOverrides: normalizedOverrides,
    spreadsheetId: FormFillerUtils.parseSpreadsheetId(input.spreadsheetId)
  };

  const overrides = FormFillerUtils.safeJsonParse(nextSettings.mappingOverrides, null);
  if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error("mappingOverrides 必須是有效的 JSON 物件。");
  }

  await storageSet(nextSettings);
  return nextSettings;
}

async function signIn() {
  assertOAuthClientConfigured();
  const token = await getAuthToken(true);
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("無法讀取 Google 帳號資訊。");
  }

  const profile = await response.json();
  return {
    email: profile.email || "",
    name: profile.name || ""
  };
}

async function signOut() {
  try {
    const token = await getAuthToken(false);
    if (token) {
      await removeCachedAuthToken(token);
    }
  } catch {
    return;
  }
}

async function fetchRecords(forceInteractive) {
  const settings = await getSettings();
  if (!settings.spreadsheetId) {
    throw new Error("請先設定 Spreadsheet ID。");
  }

  assertOAuthClientConfigured();
  const token = await getUsableToken(forceInteractive);
  const records = await requestSheetValues(settings, token);
  return {
    ...records,
    settings
  };
}

async function fetchSheetList(spreadsheetIdInput, forceInteractive) {
  const spreadsheetId = FormFillerUtils.parseSpreadsheetId(spreadsheetIdInput || "");
  if (!spreadsheetId) {
    throw new Error("請先輸入 Spreadsheet ID。");
  }

  assertOAuthClientConfigured();
  const token = await getUsableToken(forceInteractive);
  return requestSheetTitles(spreadsheetId, token);
}

async function requestSheetTitles(spreadsheetId, token, allowRetry = true) {
  const endpoint =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    "?fields=sheets.properties.title";

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401 && allowRetry) {
    await removeCachedAuthToken(token);
    const renewedToken = await getAuthToken(true);
    return requestSheetTitles(spreadsheetId, renewedToken, false);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`無法讀取 Google Sheets：${response.status} ${detail}`);
  }

  const data = await response.json();
  const sheets = Array.isArray(data.sheets) ? data.sheets : [];
  return sheets
    .map((sheet) => String(sheet?.properties?.title || "").trim())
    .filter(Boolean);
}

async function getUsableToken(forceInteractive) {
  try {
    return await getAuthToken(forceInteractive);
  } catch (error) {
    if (forceInteractive) {
      throw error;
    }

    return getAuthToken(true);
  }
}

async function requestSheetValues(settings, token, allowRetry = true) {
  const range = `${settings.sheetName}!A:ZZ`;
  const endpoint =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(settings.spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}?majorDimension=ROWS`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401 && allowRetry) {
    await removeCachedAuthToken(token);
    const renewedToken = await getAuthToken(true);
    return requestSheetValues(settings, renewedToken, false);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`無法讀取 Google Sheets：${response.status} ${detail}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.values) ? data.values : [];
  if (!rows.length) {
    return {
      headers: [],
      records: [],
      recordCount: 0,
      displayColumns: []
    };
  }

  const headers = rows[0].map((header, index) => String(header || `欄位 ${index + 1}`).trim());
  const records = rows.slice(1).map((row, index) => {
    const values = {};
    headers.forEach((header, headerIndex) => {
      values[header] = row[headerIndex] || "";
    });

    return {
      id: `row-${index + 2}`,
      rowNumber: index + 2,
      values
    };
  });

  return {
    headers,
    records,
    recordCount: records.length,
    displayColumns: FormFillerUtils.detectDisplayColumns(headers, settings.searchFields)
  };
}

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(token || "");
    });
  });
}

function assertOAuthClientConfigured() {
  const manifest = chrome.runtime.getManifest();
  const clientId = String(manifest.oauth2?.client_id || "").trim();

  const looksLikePlaceholder =
    !clientId ||
    clientId.includes("YOUR_GOOGLE_OAUTH_CLIENT_ID") ||
    !clientId.endsWith(".apps.googleusercontent.com");

  if (looksLikePlaceholder) {
    throw new Error(
      "尚未設定 OAuth Client ID。請先在 manifest.json 的 oauth2.client_id 放入你的 Google Chrome Extension OAuth client id。"
    );
  }
}

function removeCachedAuthToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function storageGet(defaults) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaults, (items) => resolve(items));
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, () => resolve());
  });
}

const pageStatus = document.getElementById("pageStatus");
const sheetStatus = document.getElementById("sheetStatus");
const extensionId = document.getElementById("extensionId");
const recordStatus = document.getElementById("recordStatus");
const message = document.getElementById("message");
const togglePanelButton = document.getElementById("togglePanelButton");
const refreshButton = document.getElementById("refreshButton");
const signInButton = document.getElementById("signInButton");
const optionsButton = document.getElementById("optionsButton");

let activeTab = null;

bootstrap().catch((error) => {
  setMessage(error.message, true);
});

togglePanelButton.addEventListener("click", async () => {
  const pageInfo = FormFillerUtils.getGoogleFormsPageInfo(activeTab?.url);
  if (!activeTab?.id || !pageInfo.isFillable) {
    setMessage(getPageHint(pageInfo), true);
    return;
  }

  try {
    await ensureFormContentScript(activeTab.id);
    await chrome.tabs.sendMessage(activeTab.id, { type: "panel:toggle" });
  } catch (error) {
    setMessage("無法注入 Google Forms 側邊面板，請重新整理頁面後再試一次。", true);
    return;
  }

  window.close();
});

refreshButton.addEventListener("click", async () => {
  setMessage("正在讀取 Google Sheets 資料...");
  const response = await chrome.runtime.sendMessage({
    type: "records:fetch",
    forceInteractive: true
  });

  if (!response.ok) {
    setMessage(response.error, true);
    return;
  }

  recordStatus.textContent = `已讀取 ${response.recordCount} 筆`;
  setMessage("資料已更新，可以回到表單頁選擇要套用的紀錄。");
});

signInButton.addEventListener("click", async () => {
  setMessage("正在登入 Google...");
  const response = await chrome.runtime.sendMessage({ type: "auth:signIn" });
  if (!response.ok) {
    setMessage(response.error, true);
    return;
  }

  const email = response.profile?.email || "未知帳號";
  setMessage(`已登入：${email}`);
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function bootstrap() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  activeTab = tab || null;

  const pageInfo = FormFillerUtils.getGoogleFormsPageInfo(activeTab?.url);
  pageStatus.textContent = getPageStatusLabel(pageInfo);

  const settingsResponse = await chrome.runtime.sendMessage({ type: "settings:get" });
  if (!settingsResponse.ok) {
    setMessage(settingsResponse.error, true);
    return;
  }

  const settings = settingsResponse.settings;
  sheetStatus.textContent = settings.spreadsheetId
    ? `${settings.sheetName} / ${settings.spreadsheetId.slice(0, 10)}...`
    : "尚未設定";
  extensionId.textContent = chrome.runtime.id;
}

function setMessage(text, isError = false) {
  message.textContent = text || "";
  message.dataset.error = isError ? "true" : "false";
}

async function ensureFormContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "panel:ping" });
    return;
  } catch {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["utils.js", "content.js"]
    });
    await chrome.tabs.sendMessage(tabId, { type: "panel:ping" });
  }
}

function getPageStatusLabel(pageInfo) {
  if (pageInfo.isFillable) {
    return "可直接填寫的 Google Forms";
  }

  switch (pageInfo.type) {
    case "editor":
      return "Google Forms 編輯頁";
    case "responses":
      return "Google Forms 回覆頁";
    case "other":
      return "Google Forms 其他頁面";
    default:
      return "不是 Google Forms 頁面";
  }
}

function getPageHint(pageInfo) {
  switch (pageInfo.type) {
    case "editor":
      return "目前在 Google Forms 編輯頁，請切換到可填寫的 viewform 頁面。";
    case "responses":
      return "目前在 Google Forms 回覆頁，請切換到可填寫的 viewform 頁面。";
    case "other":
      return "請先開啟可填寫的 Google Forms 頁面，再使用這個擴充功能。";
    default:
      return "請先切到 Google Forms 頁面，再開啟表單助手。";
  }
}

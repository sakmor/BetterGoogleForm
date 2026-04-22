const spreadsheetIdInput = document.getElementById("spreadsheetId");
const sheetNameInput = document.getElementById("sheetName");
const searchFieldsInput = document.getElementById("searchFields");
const mappingOverridesInput = document.getElementById("mappingOverrides");
const saveButton = document.getElementById("saveButton");
const testButton = document.getElementById("testButton");
const loadSheetsButton = document.getElementById("loadSheetsButton");
const testResult = document.getElementById("testResult");

loadSheetsButton.addEventListener("click", () => loadSheetList(true));

bootstrap().catch((error) => {
  setResult(error.message, true);
});

saveButton.addEventListener("click", async () => {
  try {
    const payload = collectFormValues();
    const response = await chrome.runtime.sendMessage({
      type: "settings:save",
      payload
    });

    if (!response.ok) {
      setResult(response.error, true);
      return;
    }

    setResult("設定已儲存。");
  } catch (error) {
    setResult(error.message, true);
  }
});

testButton.addEventListener("click", async () => {
  try {
    const saveResponse = await chrome.runtime.sendMessage({
      type: "settings:save",
      payload: collectFormValues()
    });

    if (!saveResponse.ok) {
      setResult(saveResponse.error, true);
      return;
    }

    setResult("正在測試 Google Sheets 連線...");
    const response = await chrome.runtime.sendMessage({
      type: "records:fetch",
      forceInteractive: true
    });

    if (!response.ok) {
      setResult(response.error, true);
      return;
    }

    const preview = response.records.slice(0, 3).map((record) => {
      const displayLines = response.displayColumns.length
        ? response.displayColumns
        : response.headers.slice(0, 3);

      return displayLines
        .map((header) => `${header}: ${record.values[header] || ""}`)
        .join("\n");
    });

    setResult(`已讀取 ${response.recordCount} 筆資料\n\n${preview.join("\n\n---\n\n")}`);
  } catch (error) {
    setResult(error.message, true);
  }
});

async function bootstrap() {
  const response = await chrome.runtime.sendMessage({ type: "settings:get" });
  if (!response.ok) {
    throw new Error(response.error);
  }

  const settings = response.settings;
  spreadsheetIdInput.value = settings.spreadsheetId || "";
  populateSheetSelect([], settings.sheetName || "");
  searchFieldsInput.value = settings.searchFields || "";
  mappingOverridesInput.value = settings.mappingOverrides || "{}";
}

async function loadSheetList(forceInteractive) {
  const parsedId = FormFillerUtils.parseSpreadsheetId(spreadsheetIdInput.value);
  if (!parsedId) {
    setResult("請先輸入 Spreadsheet ID。", true);
    return;
  }

  setResult("正在讀取工作表列表...");
  const response = await chrome.runtime.sendMessage({
    type: "sheets:list",
    spreadsheetId: parsedId,
    forceInteractive
  });

  if (!response.ok) {
    setResult(response.error, true);
    return;
  }

  populateSheetSelect(response.sheets, sheetNameInput.value || response.sheets[0] || "");
  setResult(`已載入 ${response.sheets.length} 個工作表，請確認目前選取是否正確。`);
}

function populateSheetSelect(sheets, selectedValue) {
  const names = Array.isArray(sheets) ? [...sheets] : [];
  if (selectedValue && !names.includes(selectedValue)) {
    names.unshift(selectedValue);
  }

  sheetNameInput.innerHTML = "";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selectedValue) {
      option.selected = true;
    }
    sheetNameInput.appendChild(option);
  });
}

function collectFormValues() {
  const parsedId = FormFillerUtils.parseSpreadsheetId(spreadsheetIdInput.value);
  const overrides = FormFillerUtils.safeJsonParse(mappingOverridesInput.value, null);

  if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error("mappingOverrides 必須是有效的 JSON 物件。");
  }

  return {
    spreadsheetId: parsedId,
    sheetName: (sheetNameInput.value || "").trim(),
    searchFields: searchFieldsInput.value.trim(),
    mappingOverrides: JSON.stringify(overrides, null, 2)
  };
}

function setResult(text, isError = false) {
  testResult.textContent = text || "";
  testResult.dataset.error = isError ? "true" : "false";
}

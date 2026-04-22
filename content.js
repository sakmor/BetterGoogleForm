(() => {
  if (window.__betterGoogleFormFillerLoaded) {
    return;
  }
  window.__betterGoogleFormFillerLoaded = true;

  const pageInfo = FormFillerUtils.getGoogleFormsPageInfo(location.href);
  if (!pageInfo.isFillable) {
    return;
  }

  const state = {
    panelOpen: false,
    loading: false,
    records: [],
    headers: [],
    displayColumns: [],
    searchText: "",
    settings: null,
    sheetList: []
  };

  const launcher = createLauncher();
  const panel = createPanel();
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "panel:ping") {
      sendResponse?.({ ok: true });
      return;
    }

    if (message?.type === "panel:toggle") {
      togglePanel();
    }

    sendResponse?.({ ok: true });
  });

  function createLauncher() {
    const button = document.createElement("button");
    button.id = "bgf-launcher";
    button.type = "button";
    button.textContent = "開啟表單助手";
    button.addEventListener("click", () => togglePanel());
    return button;
  }

  function createPanel() {
    const wrapper = document.createElement("aside");
    wrapper.id = "bgf-panel";
    wrapper.innerHTML = `
      <div class="bgf-header">
        <div>
          <h2 class="bgf-title">表單助手</h2>
          <p class="bgf-subtitle">連接 Google Sheets，搜尋一筆資料後直接套用到目前的 Google Form。</p>
        </div>
        <div class="bgf-header-actions">
          <button class="bgf-header-button" type="button" data-action="reload">重新讀取</button>
          <button class="bgf-header-button" type="button" data-action="close">關閉</button>
        </div>
      </div>
      <div class="bgf-settings">
        <label class="bgf-field">
          <span class="bgf-field-label">Spreadsheet ID 或完整網址</span>
          <input class="bgf-input" type="text" data-setting="spreadsheetId" placeholder="https://docs.google.com/spreadsheets/d/...">
        </label>
        <label class="bgf-field">
          <span class="bgf-field-label">工作表名稱</span>
          <div class="bgf-field-row">
            <select class="bgf-input" data-setting="sheetName"></select>
            <button class="bgf-header-button" type="button" data-action="load-sheets">讀取工作表</button>
          </div>
        </label>
        <div class="bgf-settings-actions">
          <button class="bgf-save" type="button" data-action="save-settings">儲存設定</button>
          <button class="bgf-header-button" type="button" data-action="save-and-load">儲存並載入</button>
        </div>
      </div>
      <div class="bgf-toolbar">
        <input class="bgf-search" type="search" placeholder="搜尋姓名、Email、URL、Game Code..." />
        <div class="bgf-status">請先設定 Spreadsheet ID，然後讀取資料。</div>
      </div>
      <div class="bgf-list">
        <div class="bgf-empty">設定完成後，就可以在這裡搜尋並套用資料。</div>
      </div>
    `;

    const searchInput = wrapper.querySelector(".bgf-search");
    searchInput.addEventListener("input", (event) => {
      state.searchText = event.target.value || "";
      renderRecords();
    });

    wrapper.querySelector('[data-action="save-settings"]').addEventListener("click", async () => {
      await saveSettingsFromPanel(false);
    });

    wrapper.querySelector('[data-action="save-and-load"]').addEventListener("click", async () => {
      await saveSettingsFromPanel(true);
    });

    wrapper.querySelector('[data-action="load-sheets"]').addEventListener("click", async () => {
      await loadSheetList(true);
    });

    wrapper.querySelector('[data-action="reload"]').addEventListener("click", async () => {
      await loadRecords(true);
    });

    wrapper.querySelector('[data-action="close"]').addEventListener("click", () => {
      togglePanel(false);
    });

    return wrapper;
  }

  async function togglePanel(forceOpen) {
    state.panelOpen = typeof forceOpen === "boolean" ? forceOpen : !state.panelOpen;
    panel.dataset.open = state.panelOpen ? "true" : "false";

    if (!state.panelOpen) {
      return;
    }

    await ensureSettingsLoaded();
    renderRecords();

    if (state.settings?.spreadsheetId && !state.records.length && !state.loading) {
      await loadRecords(false);
    }
  }

  async function ensureSettingsLoaded() {
    if (state.settings) {
      syncSettingsForm();
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: "settings:get" });
    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    state.settings = {
      ...response.settings,
      mappingOverrides: FormFillerUtils.safeJsonParse(response.settings?.mappingOverrides, {})
    };
    syncSettingsForm();
  }

  function syncSettingsForm() {
    if (!state.settings) {
      return;
    }

    const spreadsheetInput = panel.querySelector('[data-setting="spreadsheetId"]');

    if (spreadsheetInput) {
      spreadsheetInput.value = state.settings.spreadsheetId || "";
    }

    populateSheetSelect(state.sheetList, state.settings.sheetName || "");
  }

  function populateSheetSelect(sheets, selectedValue) {
    const select = panel.querySelector('[data-setting="sheetName"]');
    if (!select) {
      return;
    }

    const names = Array.isArray(sheets) ? [...sheets] : [];
    if (selectedValue && !names.includes(selectedValue)) {
      names.unshift(selectedValue);
    }

    select.innerHTML = "";
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      if (name === selectedValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  async function loadSheetList(forceInteractive) {
    const spreadsheetInput = panel.querySelector('[data-setting="spreadsheetId"]');
    const parsedId = FormFillerUtils.parseSpreadsheetId(spreadsheetInput?.value || "");
    if (!parsedId) {
      setStatus("請先輸入 Spreadsheet ID。", true);
      return;
    }

    setStatus("正在讀取工作表列表...");
    const response = await chrome.runtime.sendMessage({
      type: "sheets:list",
      spreadsheetId: parsedId,
      forceInteractive
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    state.sheetList = response.sheets || [];
    const currentValue =
      panel.querySelector('[data-setting="sheetName"]')?.value ||
      state.settings?.sheetName ||
      state.sheetList[0] ||
      "";
    populateSheetSelect(state.sheetList, currentValue);
    setStatus(`已載入 ${state.sheetList.length} 個工作表。`);
  }

  function getPanelSettingsPayload() {
    const spreadsheetInput = panel.querySelector('[data-setting="spreadsheetId"]');
    const sheetNameInput = panel.querySelector('[data-setting="sheetName"]');

    return {
      ...(state.settings || {}),
      spreadsheetId: FormFillerUtils.parseSpreadsheetId(spreadsheetInput?.value || ""),
      sheetName: String(sheetNameInput?.value || "").trim() || "Form Responses 1"
    };
  }

  async function saveSettingsFromPanel(reloadAfterSave) {
    const payload = getPanelSettingsPayload();
    const response = await chrome.runtime.sendMessage({
      type: "settings:save",
      payload
    });

    if (!response.ok) {
      setStatus(response.error, true);
      return;
    }

    state.settings = {
      ...response.settings,
      mappingOverrides: FormFillerUtils.safeJsonParse(response.settings?.mappingOverrides, {})
    };
    state.records = [];
    state.headers = [];
    state.displayColumns = [];
    syncSettingsForm();
    renderRecords();

    if (reloadAfterSave) {
      await loadRecords(true);
      return;
    }

    setStatus("設定已儲存，可以開始讀取資料。");
  }

  async function loadRecords(forceInteractive) {
    await ensureSettingsLoaded();
    if (!state.settings?.spreadsheetId) {
      state.records = [];
      state.headers = [];
      state.displayColumns = [];
      setStatus("請先設定 Spreadsheet ID，然後再讀取資料。", true);
      renderRecords();
      return;
    }

    state.loading = true;
    setStatus("正在讀取 Google Sheets 資料...");

    const response = await chrome.runtime.sendMessage({
      type: "records:fetch",
      forceInteractive
    });

    state.loading = false;
    if (!response.ok) {
      state.records = [];
      state.headers = [];
      state.displayColumns = [];
      setStatus(response.error, true);
      renderRecords();
      return;
    }

    state.records = response.records || [];
    state.headers = response.headers || [];
    state.displayColumns = response.displayColumns || [];
    state.settings = {
      ...response.settings,
      mappingOverrides: FormFillerUtils.safeJsonParse(response.settings?.mappingOverrides, {})
    };
    syncSettingsForm();

    const questionMatches = buildQuestionMatches();
    setStatus(`已讀取 ${response.recordCount} 筆資料，題目匹配 ${questionMatches.matched}/${questionMatches.total}。`);
    renderRecords();
  }

  function renderRecords() {
    const container = panel.querySelector(".bgf-list");

    if (!state.settings?.spreadsheetId) {
      container.innerHTML = '<div class="bgf-empty">請先填入 Spreadsheet ID 並載入資料。</div>';
      return;
    }

    const filtered = state.records.filter((record) =>
      FormFillerUtils.buildSearchText(record.values)
        .toLowerCase()
        .includes(state.searchText.trim().toLowerCase())
    );

    if (!filtered.length) {
      container.innerHTML = `<div class="bgf-empty">${state.records.length ? "找不到符合搜尋條件的紀錄。" : "目前沒有可用的資料。"}</div>`;
      return;
    }

    const displayHeaders = state.displayColumns.length ? state.displayColumns : state.headers.slice(0, 4);
    container.innerHTML = "";

    filtered.forEach((record) => {
      const card = document.createElement("article");
      card.className = "bgf-card";

      const titleHeader =
        displayHeaders.find((header) => header.includes("URL")) ||
        displayHeaders.find((header) => header.includes("網址")) ||
        displayHeaders[0];

      const title = FormFillerUtils.formatPreviewValue(
        record.values[titleHeader] || `第 ${record.rowNumber} 列`
      );
      const lines = displayHeaders
        .filter((header) => header !== titleHeader)
        .map((header) => `
          <p class="bgf-card-line"><strong>${escapeHtml(header)}</strong><br>${escapeHtml(FormFillerUtils.formatPreviewValue(record.values[header])) || "未提供"}</p>
        `)
        .join("");

      card.innerHTML = `
        <h3 class="bgf-card-title">${escapeHtml(title)}</h3>
        ${lines}
        <div class="bgf-card-actions">
          <button class="bgf-apply" type="button">套用這筆資料</button>
        </div>
      `;

      card.querySelector(".bgf-apply").addEventListener("click", async () => {
        await applyRecord(record.values);
      });

      container.appendChild(card);
    });
  }

  function buildQuestionMatches() {
    const questions = extractQuestions();
    let matched = 0;

    questions.forEach((question) => {
      const matchedHeader = FormFillerUtils.findBestHeaderMatch(
        question.title,
        state.headers,
        state.settings?.mappingOverrides || {}
      );

      if (matchedHeader) {
        matched += 1;
      }
    });

    return {
      matched,
      total: questions.length
    };
  }

  async function applyRecord(recordValues) {
    const questions = extractQuestions();
    if (!questions.length) {
      setStatus("找不到可填寫的題目，請確認目前頁面是可作答的 Google Forms。", true);
      return;
    }

    let applied = 0;
    let skipped = 0;
    let unsupported = 0;

    for (const question of questions) {
      const matched = FormFillerUtils.findBestHeaderMatch(
        question.title,
        state.headers,
        state.settings?.mappingOverrides || {}
      );

      if (!matched) {
        skipped += 1;
        continue;
      }

      const rawValue = recordValues[matched.header];
      if (!String(rawValue || "").trim()) {
        skipped += 1;
        continue;
      }

      const result = await fillQuestion(question, rawValue);
      if (result === "applied") {
        applied += 1;
      } else if (result === "unsupported") {
        unsupported += 1;
      } else {
        skipped += 1;
      }
    }

    setStatus(`已套用 ${applied} 題，略過 ${skipped} 題，不支援 ${unsupported} 題。`);
  }

  function extractQuestions() {
    const blocks = Array.from(document.querySelectorAll('[role="listitem"]'));
    return blocks
      .map((block) => analyzeQuestion(block))
      .filter(Boolean);
  }

  function analyzeQuestion(block) {
    const title = getQuestionTitle(block);
    if (!title) {
      return null;
    }

    const radioOptions = buildChoiceOptions(block, "radio");
    if (radioOptions.length) {
      return {
        type: "radio",
        title,
        block,
        options: radioOptions
      };
    }

    const checkboxOptions = buildChoiceOptions(block, "checkbox");
    if (checkboxOptions.length) {
      return {
        type: "checkbox",
        title,
        block,
        options: checkboxOptions
      };
    }

    const listbox = block.querySelector('[role="listbox"]');
    if (listbox) {
      return {
        type: "dropdown",
        title,
        block,
        control: listbox
      };
    }

    if (block.querySelector('input[type="file"]')) {
      return {
        type: "unsupported",
        title,
        block
      };
    }

    const textControl = block.querySelector(
      'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"])'
    );
    if (textControl) {
      return {
        type: "text",
        title,
        block,
        control: textControl
      };
    }

    return null;
  }

  function getQuestionTitle(block) {
    const heading = Array.from(block.querySelectorAll('[role="heading"]'))
      .map((element) => element.textContent.trim())
      .find(Boolean);

    if (heading) {
      return heading;
    }

    const labels = Array.from(block.querySelectorAll("label, span, div"))
      .map((element) => element.textContent.trim())
      .filter((text) => text.length > 4)
      .sort((left, right) => right.length - left.length);

    return labels[0] || "";
  }

  function buildChoiceOptions(block, role) {
    return Array.from(block.querySelectorAll(`[role="${role}"]`)).map((node) => {
      const container = findChoiceContainer(node, block);
      return {
        node,
        container,
        clickTarget: findChoiceClickTarget(node, container),
        label: getChoiceLabel(node, container),
        isOther: isOtherChoice({ node, container, label: getChoiceLabel(node, container) })
      };
    });
  }

  function findChoiceContainer(node, block) {
    let current = node;
    for (let depth = 0; current && depth < 6; depth += 1) {
      const siblingChoices = current.querySelectorAll?.(`[role="${node.getAttribute("role")}"]`).length || 0;
      const text = FormFillerUtils.formatPreviewValue(current.textContent);
      if (current !== block && siblingChoices <= 1 && text) {
        return current;
      }
      current = current.parentElement;
      if (current === block) {
        break;
      }
    }

    return node.parentElement || node;
  }

  function findChoiceClickTarget(node, container) {
    const candidates = [
      container,
      container?.querySelector('[role="presentation"]'),
      container?.querySelector('[role="button"]'),
      container?.querySelector("label"),
      node
    ].filter(Boolean);

    return candidates[0];
  }

  function getChoiceLabel(node, containerHint) {
    const referencedText = getReferencedChoiceText(node);
    if (isUsefulChoiceText(referencedText)) {
      return referencedText;
    }

    const attributeCandidates = [
      node.getAttribute("data-value"),
      node.getAttribute("data-answer-value"),
      node.getAttribute("aria-label"),
      node.getAttribute("aria-description"),
      node.dataset?.value
    ];

    for (const candidate of attributeCandidates) {
      const text = FormFillerUtils.formatPreviewValue(candidate);
      if (isUsefulChoiceText(text)) {
        return text;
      }
    }

    const containers = [
      containerHint,
      node,
      node.parentElement,
      node.parentElement?.parentElement,
      node.parentElement?.parentElement?.parentElement
    ].filter(Boolean);

    for (const container of containers) {
      const scopedNodes = [
        ...container.querySelectorAll('[dir="auto"]'),
        ...container.querySelectorAll("span"),
        ...container.querySelectorAll("label")
      ];

      for (const element of scopedNodes) {
        const text = FormFillerUtils.formatPreviewValue(element.textContent);
        if (isUsefulChoiceText(text)) {
          return text;
        }
      }

      const containerText = FormFillerUtils.formatPreviewValue(container.textContent);
      if (isUsefulChoiceText(containerText)) {
        return containerText;
      }
    }

    return "";
  }

  function getReferencedChoiceText(node) {
    const idRefs = [
      node.getAttribute("aria-labelledby"),
      node.getAttribute("aria-describedby")
    ]
      .filter(Boolean)
      .flatMap((value) => value.split(/\s+/g))
      .filter(Boolean);

    if (!idRefs.length) {
      return "";
    }

    const parts = idRefs
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((element) => FormFillerUtils.formatPreviewValue(element.textContent))
      .filter(isUsefulChoiceText);

    return parts.join(" ").trim();
  }

  function isUsefulChoiceText(text) {
    if (!text) {
      return false;
    }

    if (text.length > 80) {
      return false;
    }

    const normalized = FormFillerUtils.normalizeText(text);
    if (!normalized) {
      return false;
    }

    const ignored = new Set(["required", "必填", "option", "選項"]);
    return !ignored.has(normalized);
  }

  function isOtherChoice(nodeOrOption) {
    const label =
      typeof nodeOrOption === "object" && "label" in nodeOrOption
        ? nodeOrOption.label
        : getChoiceLabel(nodeOrOption);
    const node =
      typeof nodeOrOption === "object" && "node" in nodeOrOption
        ? nodeOrOption.node
        : nodeOrOption;
    const container =
      typeof nodeOrOption === "object" && "container" in nodeOrOption
        ? nodeOrOption.container
        : null;

    const normalized = FormFillerUtils.normalizeText(label);
    const isOtherLabel =
      normalized === "other" || normalized === "其他" || normalized.startsWith("其他");
    const hasFreeTextInput = Boolean(
      container?.querySelector('input[type="text"], textarea') ||
      node?.parentElement?.querySelector('input[type="text"], textarea') ||
      node?.parentElement?.parentElement?.querySelector('input[type="text"], textarea')
    );

    return isOtherLabel || hasFreeTextInput;
  }

  function rawValueRequestsOther(rawValue) {
    return FormFillerUtils.splitMultiValue(rawValue).some((item) => {
      const normalized = FormFillerUtils.normalizeText(item);
      return normalized === "other" || normalized === "其他" || normalized.startsWith("其他");
    });
  }

  async function fillQuestion(question, rawValue) {
    switch (question.type) {
      case "text":
        setTextValue(question.control, rawValue);
        return "applied";

      case "radio":
        return chooseSingleOption(question.options, rawValue);

      case "checkbox":
        return chooseMultiOptions(question, rawValue);

      case "dropdown":
        return chooseDropdown(question.control, rawValue);

      default:
        return "unsupported";
    }
  }

  function setTextValue(control, value) {
    control.focus();
    const nextValue = normalizeControlValue(control, value);
    const prototype =
      control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(control, nextValue);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.blur();
  }

  function normalizeControlValue(control, value) {
    const raw = String(value || "");
    if (control instanceof HTMLInputElement && control.type === "date") {
      return FormFillerUtils.normalizeDateValue(raw);
    }

    return raw;
  }

  function chooseSingleOption(options, rawValue) {
    const target = findBestOption(options, String(rawValue || ""));
    if (!target) {
      return "skipped";
    }

    if (target.node.getAttribute("aria-checked") !== "true") {
      target.clickTarget?.click?.();
    }
    return "applied";
  }

  async function chooseMultiOptions(question, rawValue) {
    const options = question.options || [];
    const requested = FormFillerUtils.splitMultiValue(rawValue);
    if (!requested.length) {
      return "skipped";
    }

    const explicitOther = rawValueRequestsOther(rawValue);
    let otherOption = options.find((option) => option.isOther) || null;

    if (!otherOption) {
      const blockInput = question.block?.querySelector('input[type="text"], textarea');
      if (blockInput) {
        otherOption = findOptionClosestToElement(options, blockInput, question.block);
      }
    }

    const nonOtherOptions = options.filter((option) => option !== otherOption);
    const matchedOptions = new Set();
    const unmatchedValues = [];
    let touched = 0;

    requested.forEach((item) => {
      const matchedOption = findMatchingChoiceOption(nonOtherOptions, item);

      if (matchedOption) {
        matchedOptions.add(matchedOption);
      } else {
        unmatchedValues.push(item);
      }
    });

    const needsOther = explicitOther || unmatchedValues.length > 0;
    const otherText = explicitOther ? rawValue : unmatchedValues.join(", ");

    if (needsOther && otherOption) {
      await setOtherChoiceValue(question, otherOption, otherText);
      await wait(120);
    }

    options.forEach((option) => {
      const shouldSelect = option === otherOption
        ? needsOther
        : matchedOptions.has(option);
      const checked = option.node.getAttribute("aria-checked") === "true";

      if (shouldSelect !== checked) {
        const target = option === otherOption ? option.node : option.clickTarget;
        target?.click?.();
        touched += 1;
      }
    });

    if (needsOther && otherOption) {
      await wait(120);
      await setOtherChoiceValue(question, otherOption, otherText);
    }

    return touched || matchedOptions.size > 0 || unmatchedValues.length > 0 ? "applied" : "skipped";
  }

  function findOptionClosestToElement(options, element, block) {
    let closest = null;
    let minDepth = Infinity;

    for (const option of options) {
      let ancestor = option.node.parentElement;
      let depth = 0;
      while (ancestor && ancestor !== block && depth < 10) {
        if (ancestor.contains(element)) {
          if (depth < minDepth) {
            minDepth = depth;
            closest = option;
          }
          break;
        }
        ancestor = ancestor.parentElement;
        depth += 1;
      }
    }

    return closest || options[options.length - 1] || null;
  }

  async function chooseDropdown(control, rawValue) {
    control.click();
    await wait(150);

    const options = Array.from(document.querySelectorAll('[role="option"]')).map((node) => ({
      node,
      label: getChoiceLabel(node),
      isOther: isOtherChoice(node)
    }));
    const target = findBestOption(options, rawValue);

    if (!target) {
      document.body.click();
      return "unsupported";
    }

    target.node.click();
    return "applied";
  }

  function findBestOption(options, rawValue) {
    const normalizedValue = FormFillerUtils.normalizeText(rawValue);
    const allowOther = rawValueRequestsOther(rawValue);
    let best = null;

    options.forEach((option) => {
      if (option.isOther && !allowOther) {
        return;
      }

      const normalizedLabel = FormFillerUtils.normalizeText(option.label);
      if (!normalizedLabel) {
        return;
      }

      let score = 0;
      if (normalizedLabel === normalizedValue) {
        score = 1;
      } else if (normalizedLabel.includes(normalizedValue) || normalizedValue.includes(normalizedLabel)) {
        score = 0.92;
      } else {
        score = FormFillerUtils.similarity(option.label, rawValue);
      }

      if (!best || score > best.score) {
        best = {
          ...option,
          score
        };
      }
    });

    return best && best.score >= 0.55 ? best : null;
  }

  function findMatchingChoiceOption(options, rawValue) {
    for (const option of options) {
      if (optionMatchesValue(option, rawValue)) {
        return option;
      }
    }

    return null;
  }

  function optionMatchesValue(option, rawValue) {
    const optionMeta = buildComparableMeta(option.label);
    const valueMeta = buildComparableMeta(rawValue);

    if (
      optionMeta.code &&
      valueMeta.code &&
      optionMeta.code === valueMeta.code &&
      comparableBaseMatches(optionMeta.baseForms, valueMeta.baseForms)
    ) {
      return true;
    }

    const optionForms = optionMeta.forms;
    const valueForms = valueMeta.forms;

    for (const optionForm of optionForms) {
      for (const valueForm of valueForms) {
        if (!optionForm || !valueForm) {
          continue;
        }

        if (optionForm === valueForm) {
          return true;
        }

        if (
          Math.min(optionForm.length, valueForm.length) >= 4 &&
          (optionForm.includes(valueForm) || valueForm.includes(optionForm))
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function buildComparableMeta(value) {
    const raw = String(value || "").trim();
    const codeMatch = raw.match(/\((\d+)\)\s*$/);
    const code = codeMatch ? codeMatch[1] : "";
    const rawBase = codeMatch ? raw.slice(0, codeMatch.index).trim() : raw;
    const baseForms = buildComparableForms(rawBase, true);

    return {
      code,
      baseForms,
      forms: [...new Set([...buildComparableForms(raw, false), ...baseForms])]
    };
  }

  function buildComparableForms(value, stripSuffixes) {
    const normalized = FormFillerUtils.normalizeText(value);
    const withoutTrailingDigits = normalized.replace(/\d+$/g, "");
    const withoutAllDigits = normalized.replace(/\d+/g, "");
    const baseForms = [normalized, withoutTrailingDigits, withoutAllDigits].filter(Boolean);

    if (!stripSuffixes) {
      return [...new Set(baseForms)];
    }

    const stripped = baseForms.flatMap((item) => {
      const variants = [item];
      const trimmed = item.replace(/(?:系列|組別|類別)$/g, "");
      if (trimmed && trimmed !== item) {
        variants.push(trimmed);
      }
      return variants;
    });

    return [...new Set(stripped.filter(Boolean))];
  }

  function comparableBaseMatches(leftForms, rightForms) {
    for (const left of leftForms) {
      for (const right of rightForms) {
        if (!left || !right) {
          continue;
        }

        if (left === right) {
          return true;
        }

        if (
          Math.min(left.length, right.length) >= 2 &&
          (left.includes(right) || right.includes(left))
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async function setOtherChoiceValue(question, option, value) {
    const text = String(value || "").trim();
    if (!text) {
      return;
    }

    let input = null;
    for (let attempt = 0; attempt < 5 && !input; attempt++) {
      await wait(150);
      input = findOtherChoiceInput(question, option);
    }

    if (!input) {
      return;
    }

    setTextValue(input, text);
  }

  function findOtherChoiceInput(question, option) {
    const candidates = [
      ...queryTextInputs(option.container),
      ...queryTextInputs(option.container?.parentElement),
      ...queryTextInputs(option.node?.parentElement),
      ...queryTextInputs(question?.block)
    ];

    const uniqueCandidates = [...new Set(candidates)].filter(Boolean);
    if (!uniqueCandidates.length) {
      return null;
    }

    const labelled = uniqueCandidates.find((input) => {
      const text = [
        input.getAttribute("aria-label"),
        input.getAttribute("placeholder"),
        input.parentElement?.textContent,
        input.closest("label")?.textContent
      ]
        .filter(Boolean)
        .join(" ");

      const normalized = FormFillerUtils.normalizeText(text);
      return normalized.includes("其他") || normalized.includes("other");
    });

    return labelled || uniqueCandidates[0];
  }

  function queryTextInputs(container) {
    if (!container) {
      return [];
    }

    return Array.from(
      container.querySelectorAll(
        'input[type="text"], input:not([type]), textarea'
      )
    ).filter((input) => {
      const type = (input.getAttribute("type") || "text").toLowerCase();
      return type === "text" || !input.getAttribute("type");
    });
  }

  function setStatus(text, isError = false) {
    const status = panel.querySelector(".bgf-status");
    status.textContent = text;
    status.dataset.error = isError ? "true" : "false";
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();

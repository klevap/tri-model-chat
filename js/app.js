/***********************
 *  GLOBAL VARIABLES
 ***********************/
let geminiApiKey = "";  // Для моделей Gemini (начинаются на "gemini-")
let openAiApiKey = "";  // Для OpenRouter (начинаются на "openrouter/...")

let conversationHistory = [];

// Default model parameters
let modelParams = {
  temperature: 0.0,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 4096
};

// Sound enabled by default
let playSoundOnComplete = true;

// Operation mode: "automatic" или "manual"
let currentMode = "automatic";

// Флаг для предотвращения одновременных запросов
let requestInProgress = false;

// Звуковой сигнал (короткий "бип")
const beepSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
beepSound.volume = 0.3;

// Объект для хранения последнего запроса для каждого столбца (для показа в модальном окне)
let lastRequests = {
  model1: null,
  model2: null,
  model3: null
};

/***********************
 *  DOM ELEMENT REFERENCES
 ***********************/
const elements = {
  column1: document.getElementById("column-1"),
  column2: document.getElementById("column-2"),
  column3: document.getElementById("column-3"),
  chatbox1: document.getElementById("chatbox1"),
  chatbox2: document.getElementById("chatbox2"),
  chatbox3: document.getElementById("chatbox3"),
  userQuestionDisplay: document.getElementById("user-question-display"),
  messageInput: document.getElementById("message-input"),
  sendButton: document.getElementById("send-button"),
  typingIndicator: document.getElementById("typing-indicator"),
  improvementTemplate: document.getElementById("improvement-template")
};

// Модальные окна
const templateModal = document.getElementById("template-modal");
const openTemplateModalBtn = document.getElementById("open-template-modal");
const closeModalSpan = templateModal.querySelector(".close");

const modelParamsModal = document.getElementById("model-params-modal");
const modelParamsBtn = document.getElementById("model-params-btn");
const closeParamsSpan = modelParamsModal.querySelector(".params-close");
const saveParamsBtn = document.getElementById("save-params-btn");

// Generation settings fields
const temperatureInput = document.getElementById("temperature-input");
const topkInput = document.getElementById("topk-input");
const toppInput = document.getElementById("topp-input");
const maxTokensInput = document.getElementById("max-tokens-input");

// Additional settings elements (sound, mode)
const soundCheckbox = document.getElementById("sound-checkbox");
const modeSelect = document.getElementById("mode-select");

// API key input fields
const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
const openAiApiKeyInput = document.getElementById("openai-api-key-input");

// Кнопки для очистки чата и экспорта истории
const clearChatBtn = document.getElementById("clear-chat-btn");
const exportJsonBtn = document.getElementById("export-json-btn");

// --- Элементы для настроек OpenRouter моделей ---
const modelFileInput = document.getElementById("modelFile");
const orFamilySelect = document.getElementById("orFamilySelect");

// Переменная для хранения загруженных OpenRouter моделей (из JSON)
let modelsList = []; 
// Объект для хранения выбранных моделей OpenRouter (если нужно)
let selectedModels = {
  model1: null,
  model2: null,
  model3: null
};

/***********************
 *  COOKIE-BASED SETTINGS FUNCTIONS
 ***********************/
function saveSettingsToCookie() {
  const settings = {
    modelParams: modelParams,
    playSoundOnComplete: playSoundOnComplete,
    currentMode: currentMode
  };
  const json = JSON.stringify(settings);
  document.cookie = "chatSettings=" + encodeURIComponent(json) + "; path=/; max-age=31536000";
}

function loadSettingsFromCookie() {
  const cookieString = document.cookie;
  const cookies = cookieString.split("; ").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key] = value;
    return acc;
  }, {});
  if (cookies.chatSettings) {
    try {
      const settings = JSON.parse(decodeURIComponent(cookies.chatSettings));
      modelParams = settings.modelParams || modelParams;
      playSoundOnComplete = (settings.playSoundOnComplete !== undefined)
        ? settings.playSoundOnComplete
        : playSoundOnComplete;
      currentMode = settings.currentMode || currentMode;
      temperatureInput.value = modelParams.temperature;
      // Остальные поля не забыть заполнить...
      document.getElementById("settings-persistent").checked = true;
    } catch (e) {
      console.error("Error parsing settings from cookie", e);
    }
  }
}

function deleteSettingsCookie() {
  document.cookie = "chatSettings=; path=/; max-age=0";
}

/***********************
 *  OPENROUTER MODELS SETTINGS
 ***********************/
function getFamily(modelName) {
  const match = modelName.match(/^([^: ]+)/);
  return match ? match[1] : modelName;
}

function updateOrFamilySelect() {
  // Из modelsList получаем уникальные семейства
  const families = new Set();
  modelsList.forEach(m => families.add(getFamily(m.name)));
  const options = Array.from(families)
    .map(family => `<option value="${family}">${family}</option>`)
    .join("");
  orFamilySelect.innerHTML = options;
  // При изменении семейства обновляем выпадающие меню на основной странице
  orFamilySelect.addEventListener("change", updateMainDropdowns);
  // Если уже выбрано какое-либо семейство, обновляем сразу
  updateMainDropdowns();
}

function updateMainDropdowns() {
  const selectedFamily = orFamilySelect.value;
  // Фильтруем модели из JSON по семейству
  const openrouterModels = modelsList
    .filter(m => getFamily(m.name) === selectedFamily)
    .map(m => {
      let family = getFamily(m.name);
      let shortName = m.name.replace(new RegExp("^" + family + "\\s*"), "");
      return { id: m.id, name: shortName };
    });

  // Определяем фиксированный список Gemini моделей
  const geminiModels = [
    { id: "gemini-1.5-pro-latest", name: "1.5-pro-latest" },
    { id: "gemini-1.5-flash", name: "1.5-flash" },
    { id: "gemini-1.5-flash-8b", name: "1.5-flash-8b" },
    { id: "gemini-2.0-flash-exp", name: "2.0-flash-exp" },
    { id: "gemini-exp-1206", name: "exp-1206" }
  ];

  // Обновляем все три выпадающих меню
  [1, 2, 3].forEach(col => {
    const selectElem = document.getElementById("model-select-" + col);
    selectElem.innerHTML = "";

    // optgroup для Gemini
    const geminiOptGroup = document.createElement("optgroup");
    geminiOptGroup.label = "Gemini Models";
    geminiModels.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      opt.classList.add("gemini-option");
      geminiOptGroup.appendChild(opt);
    });

    // optgroup для OpenRouter
    const orOptGroup = document.createElement("optgroup");
    orOptGroup.label = "OpenRouter Models";
    openrouterModels.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      opt.classList.add("openrouter-option");
      orOptGroup.appendChild(opt);
    });

    selectElem.appendChild(geminiOptGroup);
    selectElem.appendChild(orOptGroup);
  });
}

modelFileInput.addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      if (json.data && Array.isArray(json.data)) {
        modelsList = json.data.map(m => ({
          id: m.id,
          name: m.name,
          context_length: m.context_length,
          pricing: m.pricing
        }));
        updateOrFamilySelect();
      } else {
        alert("Неверный формат JSON. Ожидается объект с ключом 'data'.");
      }
    } catch (err) {
      alert("Ошибка чтения JSON: " + err.message);
    }
  };
  reader.readAsText(file);
});

/***********************
 *  HELPER FUNCTIONS
 ***********************/
function toggleColumnCollapse(colNumber) {
  const column =
    colNumber === 1 ? elements.column1 :
    colNumber === 2 ? elements.column2 : elements.column3;
  column.classList.toggle("collapsed");
}

function addUserQuestionToDisplay(questionText) {
  const questionLine = document.createElement("div");
  questionLine.textContent = questionText;
  elements.userQuestionDisplay.appendChild(questionLine);
}

function createIconButton(btnClass, iconClass, clickHandler, title = "") {
  const btn = document.createElement("button");
  btn.classList.add("control-button", btnClass);
  btn.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.addEventListener("click", clickHandler);
  return btn;
}

function addBotMessageToColumn(text, colIndex, index) {
  const chatbox = (colIndex === 1)
    ? elements.chatbox1
    : (colIndex === 2)
      ? elements.chatbox2
      : elements.chatbox3;

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", "bot");
  messageDiv.dataset.role = "model";
  messageDiv.dataset.index = index;

  const messageTextWrapper = document.createElement("div");
  messageTextWrapper.classList.add("message-text-wrapper");

  const messageText = document.createElement("div");
  messageText.classList.add("message-text");
  messageText.innerHTML = renderMarkdown(text);

  // Плавающая кнопка для показа запроса
  const infoBtn = document.createElement("button");
  infoBtn.classList.add("request-info-inline");
  infoBtn.innerHTML = `<i class="fas fa-info-circle" aria-hidden="true"></i>`;
  infoBtn.title = "Показать запрос";
  infoBtn.onclick = () => { showLastRequestInfo(colIndex); };

  messageTextWrapper.appendChild(infoBtn);

  // Добавляем кнопки управлений под сообщением
  const controlsWrapper = document.createElement("div");
  controlsWrapper.classList.add("controls-wrapper");

  const copyBtn = createIconButton(
    "copy-btn",
    "fas fa-copy",
    () => { navigator.clipboard.writeText(text); },
    "Copy full answer"
  );
  const regenBtn = createIconButton(
    "regen-btn",
    "fas fa-redo",
    () => { regenerateResponse(colIndex, index); },
    "Regenerate answer (without the old one)"
  );
  const regenWithLastBtn = createIconButton(
    "regen-with-last-btn",
    "fas fa-sync-alt",
    () => { regenerateResponseWithPreviousAnswer(colIndex, index); },
    "Regenerate using this answer as {{modelAnswer}}"
  );
  const editBtn = createIconButton(
    "edit-btn",
    "fas fa-edit",
    () => { toggleEditMode(messageDiv, text, colIndex); },
    "Edit answer text"
  );

  controlsWrapper.appendChild(copyBtn);
  controlsWrapper.appendChild(regenBtn);
  controlsWrapper.appendChild(regenWithLastBtn);
  controlsWrapper.appendChild(editBtn);

  // Если manual-режим — добавляем кнопки "влево"/"вправо"
  if (currentMode === "manual") {
    if (colIndex > 1) {
      const leftBtn = createIconButton(
        "left-btn",
        "fas fa-arrow-left",
        () => { redirectAnswerToColumn(colIndex, colIndex - 1, text); },
        "Send answer to the left column"
      );
      controlsWrapper.appendChild(leftBtn);
    }
    if (colIndex < 3) {
      const rightBtn = createIconButton(
        "right-btn",
        "fas fa-arrow-right",
        () => { redirectAnswerToColumn(colIndex, colIndex + 1, text); },
        "Send answer to the right column"
      );
      controlsWrapper.appendChild(rightBtn);
    }
  }

  messageTextWrapper.appendChild(messageText);
  messageDiv.appendChild(messageTextWrapper);
  messageDiv.appendChild(controlsWrapper);

  chatbox.appendChild(messageDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function replaceBotMessage(roleName, colIndex, newAnswer) {
  const chatbox = (colIndex === 1)
    ? elements.chatbox1
    : (colIndex === 2)
      ? elements.chatbox2
      : elements.chatbox3;

  // Ищем последний индекс данного roleName
  const indexes = conversationHistory
    .map((msg, idx) => (msg && msg.role === roleName ? idx : -1))
    .filter(idx => idx !== -1);

  const lastIndex = indexes.length ? indexes[indexes.length - 1] : -1;
  if (lastIndex !== -1) {
    const oldMessageElement = chatbox.querySelector(`.message[data-index="${lastIndex}"]`);
    if (oldMessageElement) {
      chatbox.removeChild(oldMessageElement);
    }
    conversationHistory[lastIndex] = null;
  }

  const newIndex = conversationHistory.length;
  addBotMessageToColumn(newAnswer, colIndex, newIndex);
  conversationHistory.push({
    role: roleName,
    parts: [{ text: newAnswer }]
  });
}

async function redirectAnswerToColumn(sourceCol, targetCol, text) {
  const userMessageObj = conversationHistory.filter(msg => msg && msg.role === "user").slice(-1)[0];
  const userMessage = userMessageObj ? userMessageObj.parts[0].text : "";

  const improvementTemplate = elements.improvementTemplate.value || "";
  const newPrompt = fillTemplate(improvementTemplate, userMessage, text);

  let targetModel = "";
  if (targetCol === 1) {
    targetModel = document.getElementById("model-select-1").value;
  } else if (targetCol === 2) {
    targetModel = document.getElementById("model-select-2").value;
  } else {
    targetModel = document.getElementById("model-select-3").value;
  }

  elements.typingIndicator.style.display = "block";

  try {
    const roleName = "model" + targetCol;
    const resp = await generateFromModel(targetModel, newPrompt, roleName);

    if (!resp.ok) {
      alert("Model error: " + resp.error);
      return;
    }

    const newAnswer = resp.text;
    replaceBotMessage(roleName, targetCol, newAnswer);

    if (playSoundOnComplete) {
      beepSound.play().catch(() => {});
    }
  } catch (err) {
    alert("Error in redirect: " + err.message);
  } finally {
    elements.typingIndicator.style.display = "none";
  }
}

function toggleEditMode(messageDiv, originalText, colIndex) {
  const messageTextDiv = messageDiv.querySelector(".message-text");
  const isEditing = messageTextDiv.classList.contains("editing");

  if (isEditing) {
    const editedText = messageTextDiv.querySelector("textarea").value;
    messageTextDiv.innerHTML = renderMarkdown(editedText);
    messageTextDiv.classList.remove("editing");
    const index = parseInt(messageDiv.dataset.index);
    if (!isNaN(index) && conversationHistory[index]) {
      conversationHistory[index].parts[0].text = editedText;
    }
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = originalText;
    textarea.style.width = "100%";
    textarea.style.height = "100px";
    messageTextDiv.innerHTML = "";
    messageTextDiv.appendChild(textarea);
    messageTextDiv.classList.add("editing");
    textarea.focus();
  }
}

function clearChat() {
  if (!confirm("Are you sure you want to clear all three chats and the question list?")) return;
  elements.chatbox1.innerHTML = "";
  elements.chatbox2.innerHTML = "";
  elements.chatbox3.innerHTML = "";
  elements.userQuestionDisplay.innerHTML = "";
  conversationHistory = [];
}

function exportJSON() {
  const exportData = { timestamp: new Date().toISOString(), conversation: conversationHistory };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat_export_${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleKeyboardShortcuts(event) {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        sendMessage();
        break;
      case "l":
        event.preventDefault();
        clearChat();
        break;
      case "e":
        event.preventDefault();
        exportJSON();
        break;
      default:
        break;
    }
  }
}

async function regenerateResponseInternal(selectedModel, newPrompt, botMessageObj, colIndex, botMsgIndex) {
  const chatbox = (colIndex === 1) ? elements.chatbox1
               : (colIndex === 2) ? elements.chatbox2
               : elements.chatbox3;

  const oldMessageElement = chatbox.querySelector(`.message[data-index="${botMsgIndex}"]`);
  elements.typingIndicator.style.display = "block";

  try {
    const resp = await generateFromModel(selectedModel, newPrompt, botMessageObj.role);
    if (!resp.ok) {
      alert("Error during regeneration: " + resp.error);
      return;
    }
    // Удаляем старое
    if (oldMessageElement) {
      chatbox.removeChild(oldMessageElement);
    }
    conversationHistory[botMsgIndex] = null;

    // Добавляем новое
    const newAnswer = resp.text;
    const newIndex = conversationHistory.length;
    addBotMessageToColumn(newAnswer, colIndex, newIndex);
    conversationHistory.push({ role: botMessageObj.role, parts: [{ text: newAnswer }] });

    if (playSoundOnComplete) {
      beepSound.play().catch(() => {});
    }
  } catch (error) {
    alert("Error during regeneration (fetch): " + error.message);
  } finally {
    elements.typingIndicator.style.display = "none";
  }
}

async function regenerateResponse(colIndex, botMsgIndex) {
  const botMessageObj = conversationHistory[botMsgIndex];
  if (!botMessageObj || !botMessageObj.role.startsWith("model")) return;

  let selectedModel = "";
  if (botMessageObj.role === "model1") {
    selectedModel = document.getElementById("model-select-1").value;
  } else if (botMessageObj.role === "model2") {
    selectedModel = document.getElementById("model-select-2").value;
  } else {
    selectedModel = document.getElementById("model-select-3").value;
  }

  // Последнее сообщение user'а
  const userMessageObj = conversationHistory.filter(msg => msg && msg.role === "user").slice(-1)[0];
  const userMessage = userMessageObj ? userMessageObj.parts[0].text : "";

  // Для шаблона
  const model1AnswerObj = conversationHistory.filter(msg => msg && msg.role === "model1").slice(-1)[0];
  const model2AnswerObj = conversationHistory.filter(msg => msg && msg.role === "model2").slice(-1)[0];
  const improvementTemplate = elements.improvementTemplate.value || "";

  let newPrompt = "";
  if (botMessageObj.role === "model1") {
    newPrompt = userMessage;
  } else if (botMessageObj.role === "model2") {
    const model1Answer = model1AnswerObj ? model1AnswerObj.parts[0].text : "";
    newPrompt = fillTemplate(improvementTemplate, userMessage, model1Answer);
  } else {
    const model2Answer = model2AnswerObj ? model2AnswerObj.parts[0].text : "";
    newPrompt = fillTemplate(improvementTemplate, userMessage, model2Answer);
  }

  await regenerateResponseInternal(selectedModel, newPrompt, botMessageObj, colIndex, botMsgIndex);
}

async function regenerateResponseWithPreviousAnswer(colIndex, botMsgIndex) {
  const botMessageObj = conversationHistory[botMsgIndex];
  if (!botMessageObj || !botMessageObj.role.startsWith("model")) return;

  let selectedModel = "";
  if (botMessageObj.role === "model1") {
    selectedModel = document.getElementById("model-select-1").value;
  } else if (botMessageObj.role === "model2") {
    selectedModel = document.getElementById("model-select-2").value;
  } else {
    selectedModel = document.getElementById("model-select-3").value;
  }

  // Последний userMessage
  const userMessageObj = conversationHistory.filter(msg => msg && msg.role === "user").slice(-1)[0];
  const userMessage = userMessageObj ? userMessageObj.parts[0].text : "";

  // Сам предыдущий ответ
  const previousModelAnswer = botMessageObj.parts[0].text;
  const improvementTemplate = elements.improvementTemplate.value || "";
  const newPrompt = fillTemplate(improvementTemplate, userMessage, previousModelAnswer);

  await regenerateResponseInternal(selectedModel, newPrompt, botMessageObj, colIndex, botMsgIndex);
}

/***********************
 *  MAIN FUNCTIONS
 ***********************/
async function sendMessage() {
  if (requestInProgress) return;
  const userMessage = elements.messageInput.value.trim();
  if (!userMessage) return;

  requestInProgress = true;
  elements.sendButton.disabled = true;
  elements.messageInput.disabled = true;

  conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
  addUserQuestionToDisplay(userMessage);
  elements.messageInput.value = "";
  elements.typingIndicator.style.display = "block";

  try {
    if (currentMode === "manual") {
      // Только одна модель (model1)
      const selectedModel = document.getElementById("model-select-1").value;
      const resp = await generateFromModel(selectedModel, userMessage, "model1");
      if (!resp.ok) {
        alert("Model error: " + resp.error);
        return;
      }
      const model1Answer = resp.text;
      const indexBot1 = conversationHistory.length;
      addBotMessageToColumn(model1Answer, 1, indexBot1);
      conversationHistory.push({ role: "model1", parts: [{ text: model1Answer }] });

      if (playSoundOnComplete) {
        beepSound.play().catch(() => {});
      }
    } else {
      // Automatic mode: три модели по цепочке
      const selectedModel1 = document.getElementById("model-select-1").value;
      const selectedModel2 = document.getElementById("model-select-2").value;
      const selectedModel3 = document.getElementById("model-select-3").value;

      // === Model 1 ===
      const resp1 = await generateFromModel(selectedModel1, userMessage, "model1");
      if (!resp1.ok) {
        alert("Model 1 error: " + resp1.error);
        return;
      }
      const model1Answer = resp1.text;
      const indexBot1 = conversationHistory.length;
      addBotMessageToColumn(model1Answer, 1, indexBot1);
      conversationHistory.push({ role: "model1", parts: [{ text: model1Answer }] });
      if (playSoundOnComplete) {
        beepSound.play().catch(() => {});
      }

      // === Model 2 ===
      const improvementTemplate = elements.improvementTemplate.value || "";
      const promptForModel2 = fillTemplate(improvementTemplate, userMessage, model1Answer);
      const resp2 = await generateFromModel(selectedModel2, promptForModel2, "model2");
      if (!resp2.ok) {
        alert("Model 2 error: " + resp2.error);
        return;
      }
      const model2Answer = resp2.text;
      const indexBot2 = conversationHistory.length;
      addBotMessageToColumn(model2Answer, 2, indexBot2);
      conversationHistory.push({ role: "model2", parts: [{ text: model2Answer }] });
      if (playSoundOnComplete) {
        beepSound.play().catch(() => {});
      }

      // === Model 3 ===
      const promptForModel3 = fillTemplate(improvementTemplate, userMessage, model2Answer);
      const resp3 = await generateFromModel(selectedModel3, promptForModel3, "model3");
      if (!resp3.ok) {
        alert("Model 3 error: " + resp3.error);
        return;
      }
      const model3Answer = resp3.text;
      const indexBot3 = conversationHistory.length;
      addBotMessageToColumn(model3Answer, 3, indexBot3);
      conversationHistory.push({ role: "model3", parts: [{ text: model3Answer }] });
      if (playSoundOnComplete) {
        beepSound.play().catch(() => {});
      }
    }
  } catch (err) {
    alert("Error during model request: " + err.message);
    console.error("Error during model request:", err);
  } finally {
    elements.typingIndicator.style.display = "none";
    requestInProgress = false;
    elements.sendButton.disabled = false;
    elements.messageInput.disabled = false;
  }
}

/**
 * Main function for generating an answer.
 * Если идентификатор модели начинается с "gemini-" – вызываем Gemini API,
 * иначе считаем, что это модель OpenRouter (начинается с "openrouter/").
 */
async function generateFromModel(modelName, promptText, modelRole) {
  // Собираем нужную "историю" (включая текущий prompt)
  const conversationForModel = buildConversationForModel(modelRole, promptText, conversationHistory);
  const lastPromptText = conversationForModel[conversationForModel.length - 1].parts[0].text;
  console.log(`[Model: ${modelName}] Prompt:\n`, lastPromptText);

  // Решаем, какая API нужна:
  if (modelName.startsWith("gemini-")) {
    return await generateFromGemini(modelName, conversationForModel, modelRole);
  } else {
    // Все остальные считаем OpenRouter
    return await generateFromOpenRouter(modelName, conversationForModel, modelRole);
  }
}

/** Генерация через Gemini API */
async function generateFromGemini(modelName, conversationForModel, modelRole) {
  if (!geminiApiKey) {
    return { ok: false, text: "", error: "Gemini API Key is not set. Please enter the key in settings." };
  }

  const requestPayload = {
    contents: conversationForModel,
    generationConfig: {
      temperature: modelParams.temperature,
      topK: modelParams.topK,
      topP: modelParams.topP,
      maxOutputTokens: modelParams.maxOutputTokens
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };

  const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
  lastRequests[modelRole] = { endpoint: modelEndpoint, payload: requestPayload };

  try {
    const response = await fetch(modelEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    const data = await response.json();
    if (data.error) {
      return { ok: false, text: "", error: data.error.message || "Unknown error from Gemini API" };
    }
    if (!data.candidates || data.candidates.length === 0) {
      return { ok: false, text: "", error: "Empty response from Gemini API" };
    }
    const botResponse = data.candidates[0].content?.parts?.[0]?.text || "";
    return { ok: true, text: botResponse };
  } catch (error) {
    return { ok: false, text: "", error: error.message };
  }
}

/** Генерация через OpenRouter API (OpenAI-совместимый формат) */
async function generateFromOpenRouter(modelName, conversationForModel, modelRole) {
  if (!openAiApiKey) {
    return { ok: false, text: "", error: "OpenRouter API Key is not set. Please enter the key in settings." };
  }

  // Преобразуем историю в формат messages
  const openAiMessages = conversationForModel.map(item =>
    item.role === "user"
      ? { role: "user", content: item.parts[0].text }
      : { role: "assistant", content: item.parts[0].text }
  );

  // Параметры (temperature и т.д.)
  const temperature = modelParams.temperature;
  const max_tokens = modelParams.maxOutputTokens;

  // Эндпоинт OpenRouter
  const openAiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

  const requestPayload = {
    model: modelName,
    messages: openAiMessages,
    temperature,
    max_tokens
  };

  lastRequests[modelRole] = { endpoint: openAiEndpoint, payload: requestPayload };

  try {
    const response = await fetch(openAiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    const data = await response.json();
    if (data.error) {
      return { ok: false, text: "", error: data.error.message || "Error from OpenRouter API" };
    }
    if (!data.choices || !data.choices.length) {
      return { ok: false, text: "", error: "Empty response from OpenRouter API" };
    }
    const botResponse = data.choices[0].message.content || "";
    return { ok: true, text: botResponse };
  } catch (error) {
    return { ok: false, text: "", error: error.message };
  }
}

/***********************
 *  SETTINGS & PERSISTENCE
 ***********************/
saveParamsBtn.addEventListener("click", () => {
  modelParams.temperature = parseFloat(temperatureInput.value) || 0.0;
  modelParams.topK = parseInt(topkInput.value) || 1;
  modelParams.topP = parseFloat(toppInput.value) || 0.95;
  modelParams.maxOutputTokens = parseInt(maxTokensInput.value) || 4096;
  playSoundOnComplete = soundCheckbox.checked;
  currentMode = modeSelect.value;
  geminiApiKey = geminiApiKeyInput.value.trim();
  openAiApiKey = openAiApiKeyInput.value.trim();

  const persistenceOption = document.querySelector('input[name="settingsPersistence"]:checked').value;
  if (persistenceOption === "persistent") {
    saveSettingsToCookie();
  } else {
    deleteSettingsCookie();
  }

  modelParamsModal.style.display = "none";
});

const resetSettingsBtn = document.getElementById("reset-settings-btn");
if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset settings to defaults and clear saved values?")) {
      modelParams = {
        temperature: 0.0,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 4096
      };
      playSoundOnComplete = true;
      currentMode = "automatic";
      geminiApiKey = "";
      openAiApiKey = "";
      temperatureInput.value = modelParams.temperature;
      topkInput.value = modelParams.topK;
      toppInput.value = modelParams.topP;
      maxTokensInput.value = modelParams.maxOutputTokens;
      soundCheckbox.checked = playSoundOnComplete;
      modeSelect.value = currentMode;
      geminiApiKeyInput.value = "";
      openAiApiKeyInput.value = "";
      document.getElementById("settings-session").checked = true;
      deleteSettingsCookie();
      alert("Settings have been reset to default.");
    }
  });
}

/***********************
 *  MODAL FOR LAST REQUEST INFO
 ***********************/
const requestModal = document.getElementById("request-modal");
const requestModalText = document.getElementById("request-modal-text");
const closeRequestModalBtn = requestModal.querySelector(".request-close");

closeRequestModalBtn.addEventListener("click", () => {
  requestModal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === requestModal) {
    requestModal.style.display = "none";
  }
});

function showLastRequestInfo(modelNumber) {
  const key = "model" + modelNumber;
  const info = lastRequests[key];
  if (!info) {
    alert("No request info available for Model " + modelNumber);
    return;
  }
  requestModalText.textContent = JSON.stringify(info, null, 2);
  requestModal.style.display = "block";
}

/***********************
 *  INITIALIZATION
 ***********************/
elements.sendButton.addEventListener("click", sendMessage);
elements.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (event.shiftKey) {
      // Перенос строки
      const start = elements.messageInput.selectionStart;
      const end = elements.messageInput.selectionEnd;
      const value = elements.messageInput.value;
      elements.messageInput.value =
        value.substring(0, start) + "\n" + value.substring(end);
      elements.messageInput.selectionStart = elements.messageInput.selectionEnd = start + 1;
      event.preventDefault();
    } else {
      event.preventDefault();
      sendMessage();
    }
  }
});

document.addEventListener("keydown", handleKeyboardShortcuts);

openTemplateModalBtn.addEventListener("click", () => {
  templateModal.style.display = "block";
});
closeModalSpan.addEventListener("click", () => {
  templateModal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === templateModal) {
    templateModal.style.display = "none";
  }
});

modelParamsBtn.addEventListener("click", () => {
  temperatureInput.value = modelParams.temperature;
  topkInput.value = modelParams.topK;
  toppInput.value = modelParams.topP;
  maxTokensInput.value = modelParams.maxOutputTokens;
  soundCheckbox.checked = playSoundOnComplete;
  modeSelect.value = currentMode;
  geminiApiKeyInput.value = geminiApiKey;
  openAiApiKeyInput.value = openAiApiKey;

  const cookieExists = document.cookie.split("; ").some(cookie => cookie.startsWith("chatSettings="));
  if (cookieExists) {
    document.getElementById("settings-persistent").checked = true;
  } else {
    document.getElementById("settings-session").checked = true;
  }

  modelParamsModal.style.display = "block";
});
closeParamsSpan.addEventListener("click", () => {
  modelParamsModal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === modelParamsModal) {
    modelParamsModal.style.display = "none";
  }
});

clearChatBtn.addEventListener("click", clearChat);
exportJsonBtn.addEventListener("click", exportJSON);

// Загрузка настроек из cookie при старте
loadSettingsFromCookie();

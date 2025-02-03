/************************************
 * utils.js
 * Utility functions
 ************************************/
function renderMarkdown(text) {
  return marked.parse(text);
}

function fillTemplate(template, userMessage, modelAnswer) {
  return template
    .replace(/{{userMessage}}/g, userMessage)
    .replace(/{{modelAnswer}}/g, modelAnswer);
}

function buildConversationForModel(modelRole, finalPrompt, conversationHistory) {
  const conversation = [];
  for (const msg of conversationHistory) {
    if (!msg) continue;
    if (msg.role === "user") {
      conversation.push({ role: "user", parts: msg.parts });
    } else if (msg.role === modelRole) {
      conversation.push({ role: "assistant", parts: msg.parts });
    }
  }
  conversation.push({ role: "user", parts: [{ text: finalPrompt }] });
  return conversation;
}

function addCopyButtonsToCodeBlocks(parentElement) {
  const codeBlocks = parentElement.querySelectorAll("pre > code");
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentNode;
    const wrapper = document.createElement("div");
    wrapper.classList.add("code-block-wrapper");
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    const copyBtn = document.createElement("button");
    copyBtn.classList.add("code-copy-btn");
    copyBtn.innerHTML = `<i class="fas fa-copy" aria-hidden="true"></i>`;
    copyBtn.title = "Copy code";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.addEventListener("click", () => {
      const codeText = codeBlock.innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        console.log("Code copied!");
      });
    });
    wrapper.appendChild(copyBtn);
  });
}

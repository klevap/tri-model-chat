/************************************
 * utils.js
 * Utility functions
 ************************************/

// Configure marked with extensions
marked.use(markedHighlight({
  langPrefix: 'hljs language-', // CSS prefix for highlight.js
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

marked.use(markedFootnote()); // Enable footnotes

marked.setOptions({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: false, // Keep this false if you want standard GFM line breaks
  pedantic: false
});

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
  const preElements = parentElement.querySelectorAll("pre");
  preElements.forEach((preElement) => {
    const codeElement = preElement.querySelector("code");
    if (!codeElement) {
      // Only add button if there's a <code> element inside <pre>
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.classList.add("code-block-wrapper");
    // Insert the wrapper before the pre element, then move the pre element inside the wrapper
    preElement.parentNode.insertBefore(wrapper, preElement);
    wrapper.appendChild(preElement);

    const copyBtn = document.createElement("button");
    copyBtn.classList.add("code-copy-btn");
    copyBtn.innerHTML = `<i class="fas fa-copy" aria-hidden="true"></i> Copy`;
    copyBtn.title = "Copy code";
    copyBtn.setAttribute("aria-label", "Copy code to clipboard");

    copyBtn.addEventListener("click", () => {
      const codeText = codeElement.innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        copyBtn.innerHTML = `<i class="fas fa-check" aria-hidden="true"></i> Copied!`;
        copyBtn.disabled = true;
        setTimeout(() => {
          copyBtn.innerHTML = `<i class="fas fa-copy" aria-hidden="true"></i> Copy`;
          copyBtn.disabled = false;
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy code: ", err);
        copyBtn.innerHTML = 'Error';
        setTimeout(() => {
          copyBtn.innerHTML = `<i class="fas fa-copy" aria-hidden="true"></i> Copy`;
          copyBtn.disabled = false;
        }, 2000);
      });
    });
    wrapper.appendChild(copyBtn);
  });
}

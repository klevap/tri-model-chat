# Tri-Model Chat

## Description

Tri-Model Chat is a web application that enables users to interact with three different language models in a single interface. It's designed to facilitate comparison and refinement of responses from various models, including Google's Gemini models and models available via OpenRouter.

## Features

*   **Three Independent Chat Columns:** Each column represents a separate chat with a different language model.
*   **Model Selection:** Choose from a range of Gemini models and OpenRouter models (requires a JSON file with model data).
*   **Automatic and Manual Modes:**
    *   **Automatic:** The user's input is sent to the first model, its response is refined by the second, and then further refined by the third.
    *   **Manual:** The user interacts with the first model, and can then manually redirect the response to the second or third model for refinement.
*   **Response Refinement:** Uses a customizable template to guide the refinement process between models.
*   **Adjustable Generation Parameters:** Control temperature, top-k, top-p, and maximum output tokens.
*   **Collapsible Columns:** Collapse columns to focus on specific responses.
*   **Conversation History:** View the entire conversation history, including user questions and model responses.
*   **Export History:** Export the conversation history as a JSON file.
*   **Edit Responses:** Edit the text of model responses directly in the interface.
*   **Regenerate Responses:** Regenerate responses with or without using the previous answer as context.
*   **Sound Notification:** Optional sound notification upon response completion.
*   **API Key Management:** Securely input and manage API keys for Gemini and OpenRouter.
*   **Settings Persistence:** Save settings to cookies for a persistent experience or use session-only settings.
*   **Responsive Design:** Adapts to different screen sizes for optimal viewing on various devices.

## Getting Started

### Prerequisites

*   **Gemini API Key:** Obtain an API key from Google AI Studio to use Gemini models.
*   **OpenRouter API Key:** Obtain an API key from OpenRouter to use their models.
*   **OpenRouter Models JSON (Optional):** A JSON file containing a list of OpenRouter models.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/klevap/tri-model-chat.git
    ```
2. Open `index.html` in your web browser.

### Usage

1. **Enter API Keys:** Click the "Generation Settings" button (gear icon) and enter your Gemini and OpenRouter API keys in the respective fields.
2. **Load OpenRouter Models (Optional):** In the "Generation Settings" modal, click "Choose File" under "OpenRouter Models" and select your JSON file. Choose a model family from the dropdown.
3. **Select Models:** Use the dropdown menus at the top of each column to select the desired models.
4. **Enter Your Message:** Type your message in the input area at the bottom.
5. **Send Message:** Click the "Send" button (paper plane icon) or press Ctrl+Enter (Cmd+Enter on macOS).
6. **Interact with Responses:**
    *   **Automatic Mode:** The response will flow through all three models sequentially.
    *   **Manual Mode:** Interact with the first model, then use the arrow buttons to redirect responses to other columns.
    *   **Edit:** Click the "Edit" button (pencil icon) to modify a response.
    *   **Regenerate:** Click the "Regenerate" button (redo icon) to get a new response without context, or the "Regenerate using this answer" button (sync-alt icon) to use the current response as context.
    *   **Copy:** Click the "Copy" button (copy icon) to copy the full response.
7. **Customize Settings:**
    *   **Generation Settings:** Adjust temperature, top-k, top-p, and max output tokens.
    *   **Sound:** Toggle sound notification on/off.
    *   **Mode:** Switch between "Automatic" and "Manual" modes.
    *   **Persistence:** Choose to save settings to cookies or use session-only settings.
8. **Edit Template:** Click the "Edit Template" button (magic wand icon) to modify the template used for response refinement.
9. **Clear Chat:** Click the "Clear Chat" button (trash icon) to clear the conversation history.
10. **Export History:** Click the "Export History" button (save icon) to download the conversation as a JSON file.

## License

This project is licensed under the [MIT license](LICENSE).

## Acknowledgments

*   **marked:** Markdown parsing library.
*   **Font Awesome:** Icons.

## Author

klevap

const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const sendButton = form.querySelector("button[type='submit']");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Store conversation history for multi-turn chat
const conversation = [];

// --- Theme Toggle Logic ---

// Immediately-invoked function to set the theme on initial load
(function () {
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    body.classList.add("dark-mode");
    if (themeToggle) themeToggle.checked = true;
  }
})();

if (themeToggle) {
  themeToggle.addEventListener("change", function () {
    body.classList.toggle("dark-mode");
    localStorage.setItem("theme", this.checked ? "dark" : "light");
  });
}

/**
 * Handles the form submission, sends the user message to the backend,
 * and displays the AI's response.
 */
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Disable form while processing to prevent multiple submissions
  input.disabled = true;
  sendButton.disabled = true;

  // Add user message to chat box and clear input
  appendMessage("user", userMessage);
  input.value = "";

  // Add temporary "Thinking..." message
  const thinkingMessageEl = appendMessage("bot", "Thinking...");

  // Prepare the conversation history to be sent to the API.
  // This includes previous turns and the new user message.
  const conversationForAPI = [
    ...conversation,
    { role: "user", text: userMessage },
  ];

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ conversation: conversationForAPI }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Use the error message from the backend if available
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    if (!data.result) {
      thinkingMessageEl.textContent = "Sorry, no response was received.";
      // Do not add to history, so the user can try again.
      // The 'finally' block will re-enable the form.
      return;
    }

    const aiResponse = data.result;

    // On success, add both the user's message and the AI's response to the history
    conversation.push({ role: "user", text: userMessage });
    conversation.push({ role: "assistant", text: aiResponse });

    // Replace "Thinking..." message with actual response
    thinkingMessageEl.innerHTML = parseBotResponse(aiResponse);
  } catch (error) {
    console.error("Error:", error);
    // Show a user-friendly error message in the chat box
    thinkingMessageEl.textContent =
      "Failed to get response from server. Please try again.";
    // Do not add the failed exchange to the history
  } finally {
    // Re-enable the form for the next message, regardless of success or failure
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }
});

/**
 * Parser sederhana untuk mengubah teks mirip markdown dari bot menjadi HTML.
 * Menangani:
 * - Teks tebal (**text**)
 * - Teks miring (*text*)
 * - Daftar bernomor
 * - Paragraf
 * @param {string} text Teks yang akan di-parse.
 * @returns {string} HTML yang dihasilkan.
 */
function parseBotResponse(text) {
  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (const line of lines) {
    // Terapkan format inline (tebal, miring) terlebih dahulu
    let formattedLine = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Cek untuk item daftar bernomor
    if (/^\d+\.\s/.test(line)) {
      if (!inList) {
        html += "<ol>";
        inList = true;
      }
      html += `<li>${formattedLine.replace(/^\d+\.\s/, "")}</li>`;
    } else {
      if (inList) {
        html += "</ol>";
        inList = false;
      }
      // Bungkus baris yang bukan daftar dan tidak kosong dalam tag <p>
      if (line.trim()) {
        html += `<p>${formattedLine}</p>`;
      }
    }
  }

  if (inList) html += "</ol>"; // Tutup daftar jika itu adalah hal terakhir dalam respons
  return html;
}

/**
 * Appends a message to the chat box and returns the DOM element.
 * @param {string} sender - 'user' or 'bot'
 * @param {string} text - The message text
 * @returns {HTMLElement} - The created message element
 */
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  if (sender === "bot" && text !== "Thinking...") {
    // Untuk pesan bot, parse format mirip markdown dan render sebagai HTML.
    // Ini aman karena konten berasal dari backend AI tepercaya kami.
    msg.innerHTML = parseBotResponse(text);
  } else {
    // Untuk pesan pengguna dan placeholder "Thinking...", gunakan textContent untuk mencegah XSS.
    msg.textContent = text;
  }

  chatBox.appendChild(msg);
  // Scroll to the bottom of the chat box to show the latest message
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

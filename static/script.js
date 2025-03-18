// In-memory storage for conversations keyed by session id.
const conversations = {}; // key: session_id, value: array of messages
let currentAgent = "Research Assistant";
let currentSessionId = null;
let conversationCounter = 1; // Used to generate new conversation session ids

// DOM Elements
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const conversationListEl = document.getElementById("conversation-list");
const dropdownContent = document.getElementById("dropdown-content");
const agentsContainer = document.getElementById("agents-container");

// ---------------------------
// Dropdown Logic
// ---------------------------
function toggleDropdown(event) {
    event.stopPropagation();
    dropdownContent.classList.toggle("show");
}

document.addEventListener("click", function (event) {
    if (dropdownContent.classList.contains("show")) {
        if (!event.target.closest(".dropdown-content") && !event.target.closest(".profile-btn")) {
            dropdownContent.classList.remove("show");
        }
    }
});

// ---------------------------
// Agent Management
// ---------------------------
async function fetchAgents() {
    try {
        const response = await fetch("/get_agents");
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        agentsContainer.innerHTML = ""; // Clear previous options

        const header = document.createElement("strong");
        header.textContent = "Select an Agent:";
        agentsContainer.appendChild(header);

        data.agents.forEach(agent => {
            const option = document.createElement("a");
            option.textContent = agent;
            option.href = "#";
            option.classList.add("agent-option");
            option.style.display = "block";
            option.style.padding = "5px 0";
            option.onclick = async function (event) {
                event.preventDefault();
                await selectAgent(agent);
                agentsContainer.style.display = "none"; // Hide after selection
            };
            agentsContainer.appendChild(option);
        });
        agentsContainer.style.display = "block";
    } catch (error) {
        console.error("Error fetching agents:", error);
    }
}

async function selectAgent(agentName) {
    try {
        const response = await fetch("/set_agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent_name: agentName })
        });
        const data = await response.json();
        if (!data.error) {
            currentAgent = agentName;
            setModelName(agentName);
            newChat(); // Reset session to prevent cross-agent mix-ups
            console.log(`Switched to agent: ${agentName}`);
        } else {
            console.error("Error switching agent:", data.error);
            alert("Error switching agent: " + data.error);
        }
    } catch (error) {
        console.error("Fetch error in selectAgent:", error);
        alert("Unable to switch agent due to a network error.");
    }
}

function setModelName(agentName) {
    const header = document.getElementById("agent-name-header");
    if (header) {
        header.textContent = agentName;
    }
}

// Fetch agents on page load
fetchAgents();

// ---------------------------
// Conversation Management
// ---------------------------
function newChat() {
    const chatNumber = conversationCounter++;
    currentSessionId = `session-${chatNumber}`;
    // Store conversation as an object with messages and the agent used.
    conversations[currentSessionId] = {
        messages: [],
        agent: currentAgent
    };
    clearChatWindow();
    addConversationToSidebar(currentSessionId, `Chat ${chatNumber} - ${currentAgent}`);
}

function loadConversation(sessionId) {
    currentSessionId = sessionId;
    clearChatWindow();
    const conversation = conversations[sessionId];
    if (conversation) {
        // Update the active model to the one tied to this conversation.
        currentAgent = conversation.agent;
        setModelName(currentAgent);
        // Render the conversation's messages.
        (conversation.messages || []).forEach(renderMessage);
    }
}

function closeConversation(event, sessionId) {
    event.stopPropagation();
    const item = event.target.closest('.conversation-item');
    if (item) item.remove();
    
    delete conversations[sessionId];
    if (currentSessionId === sessionId) {
        clearChatWindow();
        currentSessionId = null;
    }
}

function addConversationToSidebar(sessionId, title) {
    const item = document.createElement("div");
    item.className = "conversation-item";
    item.onclick = () => loadConversation(sessionId);

    const titleEl = document.createElement("span");
    titleEl.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "×";
    closeBtn.onclick = (event) => closeConversation(event, sessionId);

    item.appendChild(titleEl);
    item.appendChild(closeBtn);
    conversationListEl.appendChild(item);
}

function clearChatWindow() {
    chatWindow.innerHTML = "";
}


// ---------------------------
// Chat Messaging
// ---------------------------
async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText) return;
  
    // 1) User message
    const userMessage = { role: "user", content: messageText };
    renderMessage(userMessage);
    if (currentSessionId) {
        conversations[currentSessionId].messages.push(userMessage);
      }
    chatInput.value = "";
  
    // 2) Placeholder assistant message
    const assistantMessage = {
        role: "assistant",
        content: "Model is thinking...",
        details: "Analyzing your request and gathering information..."
    };
    // Keep a reference to the DOM element so we can update it in-place
    const assistantEl = renderMessage(assistantMessage);
    if (currentSessionId) {
        conversations[currentSessionId].messages.push(assistantMessage);
      }
    try {
        // 3) Fetch the real response
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: messageText, session_id: currentSessionId })
        });
        const data = await response.json();
    
        // 4) Update the assistant message with real content
        assistantMessage.content = data.response || `Error: ${data.error}`;
        assistantMessage.details = data.output_str || "No additional internal details available.";
        
        // 5) Update the DOM element to show Markdown

        updateMessageElement(assistantEl, assistantMessage);
        addCopyButtons();

    } catch (error) {
        console.error("Error:", error);
        assistantMessage.content = "Error: Unable to fetch response.";
        updateMessageElement(assistantEl, assistantMessage);
    }
}
function addCopyButtons() {
    // Select all <pre> elements within the chat window.
    const codeBlocks = chatWindow.querySelectorAll('pre');
    codeBlocks.forEach(block => {
      // Check if a copy button is already added
      if (!block.querySelector('.copy-code-btn')) {
        // Create a copy button
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copy';
        button.addEventListener('click', () => {
          // Copy the code content
          const codeText = block.innerText;
          navigator.clipboard.writeText(codeText).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
              button.textContent = 'Copy';
            }, 2000);
          });
        });
        block.appendChild(button);
      }
    });
  }
  
function updateMessageElement(messageEl, message) {
  const contentEl = messageEl.querySelector(".message-content");
  if (contentEl) {
    // Check if the message contains code fences.

        contentEl.innerHTML = marked.parse(message.content);

      }
      

  const detailsEl = messageEl.querySelector(".message-details");
  if (detailsEl) {
    if (message.details && message.details.includes("```")) {
      detailsEl.innerHTML = marked.parse(message.details);
    } else {
      detailsEl.textContent = message.details;
    }
  }
}

// Render a message in the chat window.
// Returns the DOM element created for the message.
function renderMessage(message) {
    const messageEl = document.createElement("div");
    messageEl.className = "chat-message " + (message.role === "user" ? "user" : "assistant");

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    // Apply Markdown formatting to the content
    contentEl.innerHTML = marked.parse(message.content);
    messageEl.appendChild(contentEl);

    if (message.details) {
        const detailsEl = document.createElement("div");
        detailsEl.className = "message-details thinking-details";
        detailsEl.innerHTML = marked.parse(message.details);
        detailsEl.style.display = "none";
        messageEl.appendChild(detailsEl);

        // Toggle details on click
        messageEl.addEventListener("click", function(event) {
            if (event.target !== detailsEl) {
                detailsEl.style.display = (detailsEl.style.display === "none") ? "block" : "none";
            }
        });
    }

    chatWindow.appendChild(messageEl);

    // Auto-scroll if user is near the bottom
    if (chatWindow.scrollTop + chatWindow.clientHeight >= chatWindow.scrollHeight - 50) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    return messageEl;
}

// Send message on Enter key.
function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// Attach event listeners
chatInput.addEventListener("keypress", handleKeyPress);
document.querySelector(".profile-btn").addEventListener("click", toggleDropdown);

// Initialize a new chat on page load
newChat();

// Expose functions and variables for testing.
window.conversations = conversations;
window.currentSessionId = currentSessionId;
window.conversationCounter = conversationCounter;
window.addCopyButton = addCopyButtons;
window.toggleDropdown = toggleDropdown;
window.newChat = newChat;
window.loadConversation = loadConversation;
window.closeConversation = closeConversation;
window.addConversationToSidebar = addConversationToSidebar;
window.clearChatWindow = clearChatWindow;
window.renderMessage = renderMessage;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.setModelName = setModelName;
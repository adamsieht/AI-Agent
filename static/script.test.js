/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Load the HTML from your index.html file so that DOM elements exist.
const html = fs.readFileSync(path.resolve(__dirname, '../templates/index.html'), 'utf8');
document.documentElement.innerHTML = html;

// Require the script file so that it attaches its functions and variables to window.
require('../static/script.js');

describe("Navigation Bar Dropdown", () => {
  test("toggleDropdown toggles the 'show' class on dropdownContent", () => {
    const dropdown = document.getElementById("dropdown-content");
    // Ensure initial state is hidden.
    dropdown.classList.remove("show");
    // Call the function without event argument (simulate event)
    window.toggleDropdown({ stopPropagation: () => {} });
    expect(dropdown.classList.contains("show")).toBe(true);
    window.toggleDropdown({ stopPropagation: () => {} });
    expect(dropdown.classList.contains("show")).toBe(false);
  });
});

describe("Conversation Management", () => {
  beforeEach(() => {
    // Clear sidebar and chat window before each test.
    document.getElementById("conversation-list").innerHTML = "";
    window.conversations = {}; // reset the in-memory storage
    window.currentSessionId = null;
    window.conversationCounter = 1;
    window.clearChatWindow();
  });

  test("newChat creates a new session, clears chat window, and adds a sidebar item", () => {
    const convList = document.getElementById("conversation-list");
    window.newChat();
    expect(window.currentSessionId).toMatch(/session-\d+/);
    expect(Object.keys(window.conversations)).toContain(window.currentSessionId);
    // Chat window should be empty
    expect(document.getElementById("chat-window").innerHTML).toBe("");
    // A conversation item should be added to the sidebar.
    expect(convList.children.length).toBe(1);
    // Check the title format
    const titleText = convList.children[0].querySelector("span").textContent;
    expect(titleText).toMatch(/Chat \d+ - .+/);
  });

  test("addConversationToSidebar adds an element with correct title", () => {
    const convList = document.getElementById("conversation-list");
    window.addConversationToSidebar("test-session", "Test Chat");
    expect(convList.children.length).toBe(1);
    const item = convList.children[0];
    expect(item.querySelector("span").textContent).toBe("Test Chat");
  });

  test("loadConversation renders messages and updates model", () => {
    // Prepopulate conversations storage with a sample conversation.
    window.conversations["session-123"] = {
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there", details: "Internal detail" }
      ],
      agent: "Test Agent"
    };
    window.loadConversation("session-123");
    // currentAgent should be updated.
    expect(window.currentAgent).toBe("Test Agent");
    // The chat window should have rendered two messages.
    const chatWindow = document.getElementById("chat-window");
    expect(chatWindow.children.length).toBe(2);
    // Check that the messages have been rendered (using a selector we know exists in our rendered structure).
    const firstMsg = chatWindow.children[0];
    expect(firstMsg.querySelector(".message-content").innerHTML).toContain("Hello");
    const secondMsg = chatWindow.children[1];
    expect(secondMsg.querySelector(".message-content").innerHTML).toContain("Hi there");
  });

  test("closeConversation removes conversation from sidebar and clears chat if current", () => {
    window.newChat();
    const currentId = window.currentSessionId;
    const convList = document.getElementById("conversation-list");
    expect(convList.children.length).toBe(1);
    
    // Create a fake event with a target element.
    const fakeEvent = {
      stopPropagation: jest.fn(),
      target: convList.children[0]
    };
    // Call closeConversation on the current conversation.
    window.closeConversation(fakeEvent, currentId);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(convList.children.length).toBe(0);
    expect(window.conversations[currentId]).toBeUndefined();
    expect(window.currentSessionId).toBe(null);
    // Chat window should be cleared.
    expect(document.getElementById("chat-window").innerHTML).toBe("");
  });
});

describe("Chat Window Functions", () => {
  beforeEach(() => {
    window.clearChatWindow();
  });

  test("clearChatWindow empties the chat window", () => {
    const chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML = "<div>Test</div>";
    window.clearChatWindow();
    expect(chatWindow.innerHTML).toBe("");
  });

  test("renderMessage creates a message element and appends to chat window", () => {
    const chatWindow = document.getElementById("chat-window");
    const message = { role: "user", content: "Test message", details: "Some details" };
    const messageEl = window.renderMessage(message);
    expect(chatWindow.children.length).toBe(1);
    expect(messageEl.classList.contains("chat-message")).toBe(true);
    // Using our code, the rendered content uses marked.parse so the plain text might be wrapped in <p> or similar.
    expect(messageEl.querySelector(".message-content").innerHTML).toContain("Test message");
    // Check details: they are rendered but hidden (style.display set to "none")
    const detailsEl = messageEl.querySelector(".message-details");
    expect(detailsEl).not.toBeNull();
    expect(detailsEl.style.display).toBe("none");
  });

  test("clicking a rendered assistant message toggles internal details", () => {
    const chatWindow = document.getElementById("chat-window");
    const message = { role: "assistant", content: "Response", details: "Internal debug info" };
    const messageEl = window.renderMessage(message);
    const detailsEl = messageEl.querySelector(".message-details");
    // Simulate a click on the message element.
    messageEl.click();
    // Since our implementation toggles the style.display property (not class 'show'), check for that.
    expect(detailsEl.style.display).toBe("block");
    // Clicking again should hide it.
    messageEl.click();
    expect(detailsEl.style.display).toBe("none");
  });
});

describe("sendMessage function", () => {
  beforeEach(() => {
    // Reset chat window and conversation state.
    window.clearChatWindow();
    window.conversations = {};
    window.currentSessionId = "session-test";
    window.conversations[window.currentSessionId] = { messages: [], agent: window.currentAgent };
    // Set a default value in chat input.
    document.getElementById("chat-input").value = "Test query";
    // Mock fetch for this test.
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          response: "Test response",
          output_str: "Test internal details"
        })
      })
    );
  });

  afterEach(() => {
    global.fetch.mockClear();
    delete global.fetch;
  });

  test("sendMessage appends user message and updates assistant message on successful fetch", async () => {
    await window.sendMessage();
    const chatWindow = document.getElementById("chat-window");
    // We expect at least two messages: one for the user and one for the assistant.
    expect(chatWindow.children.length).toBeGreaterThanOrEqual(2);
    const lastMessage = chatWindow.children[chatWindow.children.length - 1];
    // Check that the assistant message content was updated (using marked, so look for markup)
    expect(lastMessage.querySelector(".message-content").innerHTML).toContain("Test response");
    // Check internal details were updated.
    expect(lastMessage.querySelector(".message-details").innerHTML).toContain("Test internal details");
    // Verify that fetch was called with proper payload.
    expect(global.fetch).toHaveBeenCalledWith("/chat", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining(`"session_id":"${window.currentSessionId}"`)
    }));
  });

  test("sendMessage does nothing when chat input is empty", async () => {
    document.getElementById("chat-input").value = "   ";
    await window.sendMessage();
    const chatWindow = document.getElementById("chat-window");
    // No messages should be added.
    expect(chatWindow.children.length).toBe(0);
  });
});

describe("Copy Code Button Functionality", () => {
  beforeEach(() => {
    window.clearChatWindow();
  });

  test("addCopyButtons adds a copy button to each <pre> block if not present", () => {
    // Create a fake <pre> block with some code.
    const chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML = `<pre><code>console.log("Hello, world!");</code></pre>`;
    // Call addCopyButtons to attach the copy button.
    window.addCopyButtons();
    const preBlock = chatWindow.querySelector("pre");
    const copyBtn = preBlock.querySelector(".copy-code-btn");
    expect(copyBtn).not.toBeNull();
    expect(copyBtn.textContent).toBe("Copy");
  });
});

import json
from flask import Flask, render_template, request, jsonify
from agents import ParsedResponse, AGENTS, create_agent_executor

current_agent_name = "Research Assistant"  # Default agent
agent_executor = create_agent_executor(current_agent_name)

LOG_FILE = "admin_logs.json"
chat_sessions = {}
admin_logs = []

def append_log(entry):
    with open(LOG_FILE, "a") as f:
        # Write the JSON string for the entry followed by a newline.
        f.write(json.dumps(entry) + "\n")

# Load logs at startup
try:
    with open(LOG_FILE, "r") as f:
        admin_logs = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    admin_logs = []

app = Flask(__name__)

@app.route("/")
def home():
    """Serve the chat interface."""
    return render_template("index.html")

@app.route("/get_agents", methods=["GET"])
def get_agents():
    """Returns the list of available agents."""
    return jsonify({"agents": list(AGENTS.keys())})

@app.route("/set_agent", methods=["POST"])
def set_agent():
    print("set_agent route called!")
    data = request.json
    print("Received data:", data)

    global current_agent_name, agent_executor
    from agents import create_agent_executor  # Move import to avoid circular dependency

    selected_agent = data.get("agent_name")
    if selected_agent in AGENTS:
        current_agent_name = selected_agent
        agent_executor = create_agent_executor(selected_agent)
        return jsonify({"message": f"Agent switched to {selected_agent}"})
    else:
        return jsonify({"error": "Invalid agent name"}), 400

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    session_id = data.get("session_id", "default")
    query = data.get("query")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Ensure chat history exists for this session
    chat_sessions.setdefault(session_id, [])

    try:
        # Log the agent being used for this request

        # Use the agent_executor (DO NOT override it here)
        raw_response = agent_executor.invoke({"query": query, "chat_history": chat_sessions[session_id]})
        log_entry =f"Using Agent: {current_agent_name} Agent Response: {raw_response}"
        admin_logs.append(log_entry)
        append_log(log_entry)
        # Extract plain text output.
        if isinstance(raw_response, dict) and "output" in raw_response:
            response_text = raw_response["output"]
        else:
            response_text = str(raw_response)

        # Update chat history.
        chat_sessions[session_id].append({"role": "user", "content": query})
        chat_sessions[session_id].append({"role": "assistant", "content": response_text})

        return jsonify({
            "response": response_text,
            "agent_used": current_agent_name
        })

    except Exception as e:
        import traceback
        admin_logs.append(f"Error: {traceback.format_exc()}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/admin")
def admin():
    """Displays raw responses for debugging."""
    return jsonify({"admin_logs": admin_logs[-10:]})

if __name__ == "__main__":
    app.run(debug=True)

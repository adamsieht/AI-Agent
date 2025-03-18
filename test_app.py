import json
import pytest
from app import app, current_agent_name  # current_agent_name should reflect the active model

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_home_page(client):
    response = client.get("/")
    assert response.status_code == 200
    # Check that the expected header appears on the home page.
    assert b"AI Research Chatbot" in response.data

def test_chat_endpoint_valid(client):
    # Prepare a valid chat request.
    payload = {
        "query": "Test query",
        "session_id": "test-session-1"
    }
    response = client.post(
        "/chat",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    # Verify that the response includes a non-empty response message.
    assert "response" in data
    assert data["response"] != ""
    # Verify that the response includes the agent used.
    assert "agent_used" in data
    # Check that the returned agent matches the expected current agent.
    assert data["agent_used"] == current_agent_name

def test_chat_endpoint_empty_query(client):
    # An empty query should return a 400 error.
    payload = {
        "query": "",
        "session_id": "test-session-2"
    }
    response = client.post(
        "/chat",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

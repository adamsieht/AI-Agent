import json
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain.agents import create_tool_calling_agent, AgentExecutor
from tools import search_tool, wiki_tool, save_tool

load_dotenv()

AGENTS_FILE = "agents.json"

# Load saved agents from file
def load_agents():
    try:
        with open(AGENTS_FILE, "r") as f:
            print(f)
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# Save agents to file
def save_agents(agents):
    with open(AGENTS_FILE, "w") as f:
        json.dump(agents, f, indent=4)

# Load agents into memory
AGENTS = load_agents()
llm = ChatOpenAI(model="gpt-4o-mini")

# Define the agent response format
class ParsedResponse(BaseModel):
    query: str
    topic: str
    tldr: str
    sources: list[str]
    tools_used: list[str]
    reply_message: str

# Function to create an agent executor
def create_agent_executor(agent_name):
    if agent_name not in AGENTS:
        agent_name = "Research Assistant"  # Default fallback

    prompt_text = AGENTS[agent_name]
    parser = PydanticOutputParser(pydantic_object=ParsedResponse)

    # Escaping literal curly braces in the example instructions by doubling them.
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{prompt_text} Carry on a conversation naturally."),
            ("placeholder", "{chat_history}"),  # Keeps track of previous messages
            ("human", "{query}"),  # User input
            ("placeholder", "{agent_scratchpad}")  # Intermediate steps for tools
        ]
    )

    tools = [search_tool, wiki_tool, save_tool]
    agent = create_tool_calling_agent(llm=llm, prompt=prompt, tools=tools)
    
    return AgentExecutor(agent=agent, tools=tools, verbose=True)

current_agent_name = "Research Assistant"
agent_executor = create_agent_executor(current_agent_name)

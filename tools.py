from langchain_community.tools import WikipediaQueryRun, DuckDuckGoSearchRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain.tools import Tool
from datetime import datetime
import os


def save_to_txt(data: str, filename: str = "output.txt"):
    timestamp = datetime.now().strftime("%Y %m %d %H:%M %S")
    timestampName = datetime.now().strftime("%Y%m%d%H%M%S")
    os.rename(filename, f"{filename}_{timestampName}.txt")

    formatted_text = f"--- Researched Output ---\nTimestamp: {timestamp}\n{data}"

    with open(filename, "w") as f:
        f.write(formatted_text)
    return f"Data saved to {filename}_{timestamp}.txt"





save_tool = Tool(
    name="save_text_to_file",
    func=save_to_txt,
    description="Save the output to a text file."
)
search = DuckDuckGoSearchRun()
search_tool = Tool(
    name="serach_tool",
    func=search.run,
    description="Search the web for information."
)

api_wrapper = WikipediaAPIWrapper(top_k_results=3 ,doc_content_chars_max=500,lang="en")
wiki_tool = WikipediaQueryRun(api_wrapper=api_wrapper)

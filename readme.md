# AI Research Chatbot
## Overview
AI Research Chatbot is a web-based tool designed to help users interact with multiple AI agents. The tool allows you to ask questions, switch between different agents, and view formatted responses—including code snippets rendered with Markdown. This project is intended for research and experimentation with AI conversation systems.
## Installation
Follow these steps to install the webapp locally:

### Clone the Repository:
```
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```
### Create a virtual environment:
```
python -m venv venv
```

### Activate the virtual environment:
##### On Windows:
```
venv\Scripts\activate
```
##### On macOS/Linux:
```
source venv/bin/activate
```

### Install the JS dependencies:
```
npm install jest
```

### Install the Python dependencies:
```
pip install -r requirements.txt
```

### Running the Webapp
#### Start the Flask Server:
```
python app.py
The server will start on http://localhost:5000.
```
#### Access the Frontend:
Open your web browser and navigate to http://localhost:5000 to interact with the chatbot interface.

## Future Development / TODO

#### GUI Enhancements:
 - [ ] Build a graphical interface for adding new agents.
 - [ ] Create functionality to update agent prompts directly from the GUI.


#### Performance Improvements:
 - [ ] Optimize server-side processing for faster response times.
 - [ ] Investigate caching mechanisms for repeated queries.


#### User Management & Authentication:
 - [ ] Implement user registration and login.
 - [ ] Secure API endpoints with authentication.
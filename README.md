# TherapyAI - Multimodal Emotion Recognition (MER) Senior Project


## Overview
TherapyAI is a **Multimodal Emotion Recognition (MER)** platform that combines **facial emotion detection** and **text-based sentiment analysis** to interpret human emotions more accurately.  
By leveraging multiple input modes, the system provides deeper emotional understanding — useful in **AI-assisted therapy**, **mental health tracking**, and **human-computer interaction** research.



## Project Goals
- Develop a multimodal emotion recognition system using **facial expression analysis** and **text sentiment detection**.  
- Integrate both modes into a unified **web interface**.  
- Design a **modular architecture** to allow future improvements (e.g., model updates, UI enhancements, or new data modalities).



## Key Technologies

* **Web Frontend:** HTML, CSS, JavaScript (for user accounts and in-browser recording)
* **Web Backend:** Node.js, Express.js, SQLite
* **AI Pipeline:** Python, OpenCV, NLTK (VADER), FER, Ollama, AssemblyAI


## Getting Started

### Part 1: Setup the Web App (Node.js)
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/cwminard/MER-Senior-Project.git
    cd MER-Senior-Project
    ```
2.  **Install Node.js Dependencies:**
    (This will read your `package.json` and install Express, SQLite, etc.)
    ```bash
    npm install
    ```
3.  **Run the Web Server:**
    ```bash
    node server.js
    ```
    > Your web app is now running! You can visit it at `http://localhost:4000`.

---


## Repository Structure (Web App)
| File/Folder | Description |
| :--- | :--- |
| `index.html`, `styles.css` | The frontend that runs in the browser. |
| `script.js` | Handles frontend logic, page navigation, and API requests. |
| `therapyAI.py` | Core AI logic — performs emotion recognition, transcription, and sentiment analysis. |
| `server.js` | Node.js backend that handles routes, uploads, and database communication. |
| `db.js`, `schema.sql` | Configures and creates the SQLite database. |
| `package.json` | Lists all Node.js dependencies (for `npm install`). |
| `outputs/` | Stores generated audio, video, and result files. |
| `requirements.txt` | Contains a list of required Python dependencies. |
| `README.md` | Project overview and setup guide. |



## Team Members
| Name | Role |
| :--- | :--- |
| Chelsea Minard | Backend Development |
| Skylar Sawyer | Frontend Development |
| Tyler Austin | Mobile App Development |
| Toyosi Adeniji | Documentation |

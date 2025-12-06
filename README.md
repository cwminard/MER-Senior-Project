# COSC490-MER — Therapeutic AI (Local Dev)

This repository contains the Therapeutic AI demo app (web frontend + Python analysis + small Flask API). The app records short webcam videos, sends them to a local server for transcription, sentiment and (optionally) facial-emotion analysis, and returns a therapeutic chatbot response.

This README covers mandatory installation steps and how to run the project on Windows (PowerShell). It also documents optional components used by the project.

---

## Requirements (summary)
- Python 3.8+ (3.10+ recommended)
- Node.js 16+ (for the optional Node/Express server in `server/`)
- Git (optional)
- System microphone + webcam

Python packages (see `requirements.txt`):
- requests
- pandas
- nltk
- pyaudio (may require special install on Windows)
- fer
- ollama
- Flask
- flask-cors

Optional tools:
- ffmpeg (recommended if you plan to use local audio extraction instead of a remote transcription service)
- pipwin (helps install `pyaudio` on Windows)

External services / daemons used by the project:
- Ollama (local LLM runtime) — used by `therapyAI.chatbot_response()`
- AssemblyAI (cloud transcription) — the Python script can use AssemblyAI; ensure you have an API key if used.

---

## Quick setup (Windows / PowerShell)

Open PowerShell in the repository root (`c:\MAMP\htdocs\COSC490-MER`) and run these steps.

1) Create and activate a Python virtual environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2) Upgrade pip and install required Python packages

```powershell
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Notes for `pyaudio` on Windows:
- If `pip install pyaudio` fails, install `pipwin` and use it to install the prebuilt wheel:

```powershell
pip install pipwin
pipwin install pyaudio
```

3) Download required NLTK data

Open a Python shell (within the venv) and run:

```python
import nltk
nltk.download('vader_lexicon')
```

4) (Optional) Install ffmpeg

- Download ffmpeg from https://ffmpeg.org/download.html and add the `bin` folder to your PATH. This is only necessary if you intend to use ffmpeg-based audio extraction locally.

5) Install and run Ollama (if using local LLM)

- Follow instructions at https://ollama.com to install the Ollama CLI/daemon.
- Start the daemon before using the app: in a separate terminal run:

```powershell
ollama serve
```

6) AssemblyAI API key

- If `therapyAI.py` is configured to upload to AssemblyAI for transcription, you must provide an API key. The example code contains a placeholder API key — replace it with your own or modify `therapyAI.transcribe_audio()` to read an environment variable.

To set an environment variable in PowerShell for the current session:

```powershell
$env:ASSEMBLYAI_API_KEY = "your_api_key_here"
```

Then edit `therapyAI.py` to use `os.environ.get('ASSEMBLYAI_API_KEY')` inside `transcribe_audio()` (the file currently includes a hardcoded key — replace it).

---

## Running the app (options)

Two server options exist in the repo. Use one at a time.

A) Run the Python/Flask server (recommended for single-process dev)

```powershell
# Ensure venv is activated
python flask_api.py
```

- The Flask app serves static files and provides endpoints used by the frontend:
  - `POST /record` — save upload and run `therapyAI.main()` (full analysis)
  - `GET/POST /chat` — send messages or upload a chat reply video (transcribe-only for chat uploads)

- Default host/port: `0.0.0.0:5000`. Set `PORT` env var to change.

B) Run the Node/Express server (legacy/alternate)

```powershell
npm install
npm run dev
```

This runs `server/server.js` (if you prefer that server). Note the frontend is static and can be served by either server; the Flask server integrates the Python analysis functions directly.

---

## Usage (developer flow)

1. Open the app in your browser (when Flask is running):

  http://localhost:5000

2. Go to the `Recorder` page, allow camera and mic permissions.
3. Click `Start recording` to capture a short video and mic audio.
4. Use `Upload` to send the video to the server for full analysis (speech + facial emotions) and get the therapist response.

Chat mode
- At the bottom of the Recorder page you can `Record Reply` (single button): the clip is recorded and then automatically sent as a chat reply (the server transcribes the audio and skips facial emotion analysis for chat replies).
- You can also type text into the chat box and click `Send`.

---

## Development notes and troubleshooting

- If you see `requests.exceptions.ConnectionError` when the Python code tries to contact AssemblyAI, check network connectivity and DNS. If you're behind a proxy, configure `HTTP_PROXY`/`HTTPS_PROXY` for the Python process.
- If `fer` (facial emotion recognition) fails with errors like "no frames" or MTCNN errors, ensure the video contains visible faces and try with different video sizes. The code already guards and returns empty emotions on failure.
- If `pyaudio` installation fails on Windows, use `pipwin` as shown above.
- If the Flask server reports blocking long-running analysis, consider running analysis in a worker or offloading heavy tasks — the project currently runs `therapyAI.main()` in-process for simplicity.

---

## Files of interest
- `index.html` — frontend UI
- `script.js` — frontend logic (recorder, chat, uploader)
- `flask_api.py` — Python Flask server that calls `therapyAI` in-process
- `therapyAI.py` — Python analysis: transcription, sentiment, (optional) FER video emotions, and chatbot integration
- `requirements.txt` — Python dependencies
- `package.json` — Node server dependencies (optional)

---

Tell me which of the above you'd like next and I will implement it.
# TherapyAI - Multimodal Emotion Recognition (MER) Senior Project

### Mobile App
[![Mobile App Repo](https://img.shields.io/badge/Mobile%20App-MoodSnap-blue?style=for-the-badge)](https://github.com/yelofoot/MoodSnap)


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

### 1. Run the Web Application (Node.js)
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/cwminard/MER-Senior-Project.git
    cd MER-Senior-Project
    ```
2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```
3.  **Create environment file:**
    ```bash
    cp server/.env.example server/.env
    ```
4.  **Run The Application**
    ```bash
    npm run dev
    ```
    > Your web app is now running! You can visit it at `http://localhost:4000`.

---

## Authentication & Data Flow

This section outlines the primary API endpoints used for user authentication and managing user-specific data.

1.  **Signup:** $\rightarrow$ `POST /api/signup`
2.  **Login:** $\rightarrow$ `POST /api/login`
3.  **Authenticated Requests**
4.  **Preferences:** $\rightarrow$ `PUT /api/preferences`
5.  **Profile:** $\rightarrow$ `GET /api/me` and `PUT /api/me`
6.  **Uploads:** $\rightarrow$ `POST /api/upload`

---

## Repository Structure (Web App)
| File/Folder | Description |
| :--- | :--- |
| `index.html`, `styles.css` | Main HTML structure and CSS styling (UI). |
| `script.js` | Frontend logic for **camera/mic recording**, API calls, and UI updates. |
| `/server/server.js` | Core Node.js backend handling authentication, API routing, processing, and database interactions. |
| `db.js`, `schema.sql` | Database configuration and SQL schema for SQLite setup. |
| `package.json, package-lock.json` | Lists all Node.js dependencies (for `npm install`). |
| `outputs/` | Stores generated audio, video, and result files during processing. |
| `therapyAI.py` | core AI logic — performed emotion recognition, transcription, and sentiment analysis. (no longer used)|
| `README.md` | Project overview and setup guide. |



## Team Members
| Name | Role |
| :--- | :--- |
| Chelsea Minard | Backend Development |
| Skylar Sawyer | Frontend & Database Development |
| Tyler Austin | Mobile App Development |
| Toyosi Adeniji | Documentation |

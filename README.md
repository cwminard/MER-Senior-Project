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

### Web Frontend:
* **HTML, CSS, JavaScript:** Core web structure, styling, and interactivity for the user interface.
* **Media APIs** ($navigator.mediaDevices.getUserMedia$, $MediaRecorder$): Used for **in-browser audio/video recording**.

### Web Backend:
* **Node.js, Express.js:** Server-side runtime and web application framework.
* **SQLite:** Lightweight local database for user authentication and data storage.

### AI Pipeline:
* **AssemblyAI:** **Speech-to-Text** transcription, converting audio input to usable text.
* **NLTK:** Natural Language Toolkit for **text-based sentiment analysis**.
* **FER:** Library used for **facial emotion recognition** from video input.
* **Ollama:** Local **LLM-powered reasoning** and high-level response generation.
* **Python:** AI tasks/data processing.



## System Requirements / Prerequisites

Ensure you have the following software installed and configured before running the application:

* **Node.js:** Version **18+**
* **Ollama:** Must be installed and running locally to handle LLM reasoning tasks.
* **AssemblyAI API Key:** Required for speech-to-text transcription.
* **Browser:** Google Chrome is recommended for stable MediaRecorder API support.
* **Python:** Version **3.10+**



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

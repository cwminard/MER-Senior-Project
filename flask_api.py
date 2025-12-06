#!/usr/bin/env python
import os
import sys
import time
import json
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = ROOT / 'server' / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

import traceback

app = Flask(__name__, static_folder=str(ROOT), static_url_path='')

# Show traceback in JSON responses when debugging (default ON). Set SHOW_TRACE=0 to disable.
SHOW_TRACE = os.environ.get('SHOW_TRACE', '1') != '0'


@app.route('/record', methods=['POST'])
def record():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    name = secure_filename(f.filename)
    stamp = int(time.time() * 1000)
    stored = f"{stamp}-{name}"
    dest = UPLOAD_DIR / stored
    f.save(dest)
    app.logger.info(f"Saved upload: {dest}")

    # Run local analysis by calling therapyAI.main(filepath)
    try:
        import importlib
        therapyAI = importlib.import_module('therapyAI')
        importlib.reload(therapyAI)
        res = therapyAI.main(str(dest))
        return jsonify(res)
    except Exception as e:
        app.logger.exception('analysis failed')
        resp = {'error': 'analysis failed', 'detail': str(e)}
        if SHOW_TRACE:
            resp['trace'] = traceback.format_exc()
        return jsonify(resp), 500


# Simple in-memory conversation store: { session_id: [ {role, content, ts} ] }
conversations = {}


@app.route('/chat', methods=['GET','POST'])
def chat_endpoint():
    """Accepts: form fields: session (optional), text (optional), file (optional)
    If a file is provided, run full analysis (therapyAI.main) on it to extract text/emotions/sentiment.
    The user's message will be the provided text or the transcribed audio from the uploaded file.
    Returns the assistant reply and the full conversation history for the session.
    """
    session_id = request.form.get('session') or request.args.get('session')
    if not session_id:
        # create a lightweight session id
        session_id = str(int(time.time() * 1000))

    # ensure session exists
    conversations.setdefault(session_id, [])

    # GET returns the current history for the session (if any)
    if request.method == 'GET':
        return jsonify({'session': session_id, 'history': conversations.get(session_id, [])})

    user_text = request.form.get('text')
    saved_file = None

    # if file uploaded, save and analyze to derive text + emotions
    if 'file' in request.files:
        f = request.files['file']
        if f and f.filename:
            name = secure_filename(f.filename)
            stamp = int(time.time() * 1000)
            stored = f"{stamp}-{name}"
            dest = UPLOAD_DIR / stored
            f.save(dest)
            app.logger.info(f"Saved chat upload: {dest}")
            saved_file = str(dest)
            try:
                import importlib
                therapyAI = importlib.import_module('therapyAI')
                importlib.reload(therapyAI)
                # For chat-uploaded videos (user reply), only transcribe the audio and determine sentiment.
                # Skip facial emotion analysis to avoid making judgments based on the user's face for chat replies.
                transcript_text = None
                try:
                    transcript_text = therapyAI.transcribe_audio(saved_file)
                except Exception as e:
                    # bubble transcription error up
                    raise

                sentiment = therapyAI.determine_sentiment(transcript_text or "")
                analysis = {'text': transcript_text, 'sentiment': sentiment, 'emotions': []}

                # if no explicit text provided, use transcription
                if not user_text and isinstance(analysis.get('text'), str):
                    user_text = analysis.get('text')

                # store the analysis metadata as a system message for context (no facial emotions)
                meta_msg = {
                    'role': 'system',
                    'content': f"[Video analysis] emotions={analysis.get('emotions')} sentiment={analysis.get('sentiment')}"
                }
                conversations[session_id].append({ 'role': meta_msg['role'], 'content': meta_msg['content'], 'ts': int(time.time()) })
            except Exception as e:
                app.logger.exception('chat analysis failed')
                if SHOW_TRACE:
                    return jsonify({'error': 'analysis failed', 'detail': str(e), 'trace': traceback.format_exc()}), 500
                return jsonify({'error': 'analysis failed', 'detail': str(e)}), 500

    # require some text to produce a reply
    if not user_text:
        return jsonify({'error': 'no text or file provided'}), 400

    # append user message to history
    conversations[session_id].append({'role': 'user', 'content': user_text, 'ts': int(time.time())})

    # Build history for chatbot (exclude ts)
    history = [{'role': m['role'], 'content': m['content']} for m in conversations[session_id] if m.get('role') in ('user','assistant','system')]

    try:
        import importlib
        therapyAI = importlib.import_module('therapyAI')
        importlib.reload(therapyAI)
        # use last-known emotions/sentiment if available by scanning system meta messages
        emotions = None
        sentiment = 'neutral'
        # simple parsing of last system meta
        for m in reversed(conversations[session_id]):
            if m['role'] == 'system' and m['content'].startswith('[Video analysis]'):
                # parse basic key=val pairs
                parts = m['content'].replace('[Video analysis]','').strip().split()
                for p in parts:
                    if p.startswith('emotions='):
                        try:
                            emotions = eval(p.split('=',1)[1])
                        except Exception:
                            emotions = None
                    if p.startswith('sentiment='):
                        sentiment = p.split('=',1)[1]
                break

        reply = therapyAI.chatbot_response(emotions, sentiment, user_text, history=history)
        # store assistant reply
        conversations[session_id].append({'role': 'assistant', 'content': reply, 'ts': int(time.time())})
        return jsonify({'session': session_id, 'reply': reply, 'history': conversations[session_id]})
    except Exception as e:
        app.logger.exception('chat failed')
        resp = {'error': 'chat failed', 'detail': str(e)}
        if SHOW_TRACE:
            resp['trace'] = traceback.format_exc()
        return jsonify(resp), 500


# Serve uploaded files
@app.route('/uploads/<path:fname>')
def uploaded_file(fname):
    return send_from_directory(str(UPLOAD_DIR), fname)


# Serve frontend (static files) and fallback to index.html
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    target = ROOT / path
    if path and target.exists() and target.is_file():
        return send_from_directory(str(ROOT), path)
    return send_from_directory(str(ROOT), 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

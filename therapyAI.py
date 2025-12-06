import time
import sys

import requests
import time

def transcribe_audio(filepath):
  base_url = "https://api.assemblyai.com"

  headers = {
      "authorization": "6a35340cac1c443e8e4bbc1d027a3ad5"
  }
  with open(filepath, "rb") as f:
    response = requests.post(base_url + "/v2/upload",
                            headers=headers,
                            data=f)

  audio_url = response.json()["upload_url"]


  data = {
      "audio_url": audio_url,
      "speech_model": "universal"
  }

  url = base_url + "/v2/transcript"
  response = requests.post(url, json=data, headers=headers)

  transcript_id = response.json()['id']
  polling_endpoint = base_url + "/v2/transcript/" + transcript_id

  while True:
    transcription_result = requests.get(polling_endpoint, headers=headers).json()
    transcript_text = transcription_result['text']

    if transcription_result['status'] == 'completed':
      print("Transcription completed.", file=sys.stderr)
      return transcript_text
      # with open("transcript.txt", "w") as file:
      #   file.write(transcript_text) # we don't necessarily need to write it into a file
      # file.close()

    elif transcription_result['status'] == 'error':
      raise RuntimeError(f"Transcription failed: {transcription_result['error']}")

    else:
      time.sleep(3)

import nltk
import pandas as pd
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.sentiment.util import *

def determine_sentiment(text):
    analyzer = SentimentIntensityAnalyzer()
    score = analyzer.polarity_scores(text)
    if score['compound'] >= 0.05:
        return 'positive'
    elif score['compound'] <= -0.05:
        return 'negative'
    else:
        return 'neutral'
    
from fer.fer import FER
from fer.classes import Video
import pandas as pd

def analyze_video_emotions(video_path):
  emotion_detector = FER(mtcnn=True)
  video = Video(video_path)
  try:
    frames_emotions = video.analyze(emotion_detector, display=False, frequency=15)
    # frames_emotions may be empty if no faces/frames were detected
    if not frames_emotions:
      print("Video emotion analysis returned no frames/metadata.", file=sys.stderr)
      return []
    df = pd.DataFrame(frames_emotions)
    print("Video emotion analysis complete.", file=sys.stderr)
    stats = df.describe()
    # pick top 2 dominant emotion labels if available
    emotions = stats.loc['mean'].nlargest(2).index.tolist()
    return emotions
  except Exception as e:
    print(f"video analysis failed: {e}", file=sys.stderr)
    return []

from ollama import chat
from ollama import ChatResponse

def chatbot_response(emotions, sentiment, text, history=None):
  # Safely handle missing or short emotions list
  em1 = 'neutral'
  em2 = 'neutral'
  try:
    if emotions and len(emotions) > 0:
      em1 = emotions[0]
    if emotions and len(emotions) > 1:
      em2 = emotions[1]
  except Exception:
    em1 = em2 = 'neutral'

  try:
    # Build messages with optional history; keep a helpful system prompt first
    # build emotion description: omit the second emotion if it's neutral
    if em2 and em2 != 'neutral':
      emotions_desc = f"the user's primary emotions {em1} and {em2}"
    else:
      emotions_desc = f"the user's primary emotion {em1}"

    system_msg = {
      'role': 'system',
      'content': (
        f"Based on {emotions_desc} from the video analysis, and "
        f"based on the sentiment of the text which is {sentiment}, be a therapeutic, empathetic assistant. "
        f"Provide supportive advice and surface any inconsistencies between sentiment and facial emotion. "
        f"If a follow-up question is necessary to clarify risk or safety, ask gently; otherwise prefer reflection and concrete coping suggestions."
      )
    }

    msgs = [system_msg]
    # Append any prior conversation messages (expects list of {role, content})
    if history and isinstance(history, list):
      for m in history:
        # only allow role and content
        if isinstance(m, dict) and 'role' in m and 'content' in m:
          msgs.append({'role': m['role'], 'content': m['content']})

    # append the current user utterance
    msgs.append({'role': 'user', 'content': text})

    response: ChatResponse = chat(model='gemma3', messages=msgs)
    return response.message.content
  except Exception as e:
    print(f"chatbot error: {e}", file=sys.stderr)
    return f"(chatbot error: {e})"

def main(filepath):
   text = transcribe_audio(filepath)
   sentiment = determine_sentiment(text)
   emotions = analyze_video_emotions(filepath)
   response = chatbot_response(emotions, sentiment, text)
   return {
       "text": text,
       "sentiment": sentiment,
       "emotions": emotions,
       "response": response
   }

  

# import flask
# from flask import Flask, render_template
# import jsonify
# from flask import request, jsonify

# app = Flask(__name__)


# if __name__ == '__main__':
#   # Simple CLI wrapper so this module can be invoked from Node
#   import sys
#   import json
#   from pathlib import Path
#   import subprocess
#   import tempfile

#   if len(sys.argv) < 2:
#     print(json.dumps({"error": "No video file path provided"}))
#     sys.exit(1)

#   video_file = sys.argv[1]
#   video_path = Path(video_file)
#   if not video_path.exists():
#     print(json.dumps({"error": "Video file not found"}))
#     sys.exit(1)

#   # Extract audio to a temporary wav using ffmpeg (must be installed)
#   with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmpwav:
#     wav_path = tmpwav.name
#   try:
#     # ffmpeg -y -i input.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 1 out.wav
#     subprocess.check_call([
#       'ffmpeg', '-y', '-i', str(video_path), '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '1', wav_path
#     ], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
#   except Exception as e:
#     # ffmpeg failures: emit JSON error to stdout for parser and log to stderr
#     print(json.dumps({"error": f"ffmpeg failed: {e}"}))
#     print(f"ffmpeg failed: {e}", file=sys.stderr)
#     sys.exit(1)

#   try:
#     text = transcribe_audio(wav_path)
#   except Exception as e:
#     print(json.dumps({"error": f"transcription failed: {e}"}))
#     print(f"transcription failed: {e}", file=sys.stderr)
#     sys.exit(1)

#   sentiment = determine_sentiment(text)

#   try:
#     emotions = analyze_video_emotions(str(video_path))
#   except Exception as e:
#     print(json.dumps({"error": f"video analysis failed: {e}"}))
#     print(f"video analysis failed: {e}", file=sys.stderr)
#     sys.exit(1)

#   try:
#     bot = chatbot_response(emotions, sentiment, text)
#   except Exception as e:
#     bot = f"chatbot error: {e}"
#     print(f"chatbot error: {e}", file=sys.stderr)

#   out = {
#     "text": text,
#     "sentiment": sentiment,
#     "emotions": emotions,
#     "response": bot
#   }
#   print(json.dumps(out))


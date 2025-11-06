import cv2 as cv
import pyaudio
import wave
import time
import threading

def record_video_and_audio():
    cap = cv.VideoCapture(0)
    fourcc = cv.VideoWriter_fourcc(*'mp4v')
    out = cv.VideoWriter('C:\\Users\\chels\\Desktop\\COSC490-MER\\outputs\\video\\output.mp4', fourcc, 20.0, (640, 480))

    CHUNK = 4096  # Increased chunk size for smoother audio
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 44100
    WAVE_OUTPUT_FILENAME = "C:\\Users\\chels\\Desktop\\COSC490-MER\\outputs\\audio\\output.wav"
    frames = []

    p = pyaudio.PyAudio()
    stream = None

    audio_started = False
    audio_running = True

    def audio_record():
        nonlocal stream, frames, audio_running
        stream = p.open(format=FORMAT,
                        channels=CHANNELS,
                        rate=RATE,
                        input=True,
                        frames_per_buffer=CHUNK)
        print("* recording audio")
        while audio_running:
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)

    audio_thread = threading.Thread(target=audio_record)
    audio_thread.start()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Can't receive frame (stream end?). Exiting ...")
            break
        out.write(frame)
        cv.imshow('frame', frame)

        if cv.waitKey(1) == ord('q'):
            break

    # Cleanup video
    cap.release()
    out.release()
    cv.destroyAllWindows()

    # Cleanup audio
    audio_running = False
    audio_thread.join()
    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(WAVE_OUTPUT_FILENAME, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()
    print("* done recording audio")

import requests
import time

def transcribe_audio():
  base_url = "https://api.assemblyai.com"

  headers = {
      "authorization": "6a35340cac1c443e8e4bbc1d027a3ad5"
  }
  with open("outputs/audio/output.wav", "rb") as f:
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
      print("Transcription completed.")
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
def analyze_video_emotions():
    emotion_detector = FER(mtcnn=True)
    video = Video("C:\\Users\\chels\\Desktop\\COSC490-MER\\outputs\\video\\output.mp4")


    emotions = video.analyze(emotion_detector, display=False, frequency=15)
    df = pd.DataFrame(emotions)


    stats = df.describe()
    emotions = stats.loc['mean'].nlargest(2).index.tolist()
    return emotions

from ollama import chat
from ollama import ChatResponse

def chatbot_response(emotions, sentiment, text):
  response: ChatResponse = chat(model='gemma3', messages=[
    {
      'role': 'system',
      'content': f'Based on the user\'s two primary emotions {emotions[0]} and {emotions[1]} from the video analysis, and based on the sentiment of the text which is {sentiment}, generate a therapuetic, empathetic response to the user\'s words. Avoid asking follow-up questions (if waranted), but rather provide advice as a therapist would. Also, take notice of any inconsistencies in user sentiment vs. their facial emotion. The user said: {text}'
    }
  ])
  # or access fields directly from the response object
  print(response.message.content)

record_video_and_audio() # record and capture the audio
text = transcribe_audio()
sentiment = determine_sentiment(text)
chatbot_response(analyze_video_emotions(), sentiment, text)
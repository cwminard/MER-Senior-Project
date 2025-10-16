import requests
import time
from nltk.classify import NaiveBayesClassifier
from nltk.corpus import subjectivity
from nltk.sentiment import SentimentAnalyzer
from nltk.sentiment.util import *


base_url = "https://api.assemblyai.com"

headers = {
    "authorization": "6a35340cac1c443e8e4bbc1d027a3ad5"
}
# You can upload a local file using the following code
with open("output.wav", "rb") as f:
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
    with open("transcript.txt", "w") as file:
      file.write(transcript_text)
    file.close()
    break

  elif transcription_result['status'] == 'error':
    raise RuntimeError(f"Transcription failed: {transcription_result['error']}")

  else:
    time.sleep(3)


import openai
import whisper
model = whisper.load_model("base.en")
transcript = model.transcribe("output.mp4")
print(transcript)
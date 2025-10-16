import cv2 as cv
import pyaudio
import wave
import time

# Video recording function
def record_video_and_audio():
    cap = cv.VideoCapture(0)
import threading

def record_video_and_audio():
    cap = cv.VideoCapture(0)
    fourcc = cv.VideoWriter_fourcc(*'mp4v')
    out = cv.VideoWriter('output.mp4', fourcc, 20.0, (640, 480))

    CHUNK = 4096  # Increased chunk size for smoother audio
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 44100
    WAVE_OUTPUT_FILENAME = "output.wav"
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

record_video_and_audio()
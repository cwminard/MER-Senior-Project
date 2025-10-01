import streamlit as st
import pandas as pd
import kagglehub

st.title("File Uploader Example")
uploaded_file = st.file_uploader("Choose a file")
if uploaded_file is not None:
    st.write("Filename:", uploaded_file.name)
    st.write("File type:", uploaded_file.type)
    st.write("File size:", uploaded_file.size, "bytes")
    # To read file as bytes:
    bytes_data = uploaded_file.getvalue()
    st.write("File content as bytes:", bytes_data)
    # To convert to a string based IO:
    stringio = StringIO(uploaded_file.getvalue().decode("utf-8"))
    st.write("File content as string IO:", stringio)
    # To read file as string:
    string_data = stringio.read()
    st.write("File content as string:", string_data)
    # Can be used wherever a "file-like" object is accepted:
    dataframe = pd.read_csv(uploaded_file)
    st.write(dataframe)


path = kagglehub.dataset_download("ananthu017/emotion-detection-fer")

print("Path to dataset files:", path)
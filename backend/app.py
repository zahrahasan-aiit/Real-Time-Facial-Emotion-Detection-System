from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image
import os

app = Flask(__name__)
CORS(app)

# Load the trained model
MODEL_PATH = 'emotion_detection.h5'
model = None
class_names = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully!")
    else:
        print("Warning: Model file not found. Please train the model first.")

load_model()

@app.route('/')
def index():
    return jsonify({"message": "Emotion Detection API is running!"})

@app.route('/predict', methods=['POST'])
def predict_emotion():
    try:
        if model is None:
            return jsonify({"error": "Model not loaded. Please train the model first."}), 500
        
        # Get image from request
        data = request.get_json()
        image_data = data['image']
        
        # Decode base64 image
        image_data = image_data.split(',')[1]  # Remove data:image/jpeg;base64,
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            img_gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            img_gray = img_array
        
        # Detect face using Haar Cascade
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(img_gray, 1.3, 5)
        
        if len(faces) == 0:
            return jsonify({"error": "No face detected"}), 400
        
        # Get the first face
        (x, y, w, h) = faces[0]
        face_img = img_gray[y:y+h, x:x+w]
        
        # Resize to 48x48 and normalize
        face_img = cv2.resize(face_img, (48, 48))
        face_img = face_img / 255.0
        face_img = np.expand_dims(face_img, axis=-1)  # Add channel dimension
        face_img = np.expand_dims(face_img, axis=0)   # Add batch dimension
        
        # Predict emotion
        prediction = model.predict(face_img)
        predicted_index = np.argmax(prediction)
        predicted_emotion = class_names[predicted_index]
        confidence = float(prediction[0][predicted_index] * 100)
        
        # Get all probabilities
        all_probabilities = {class_names[i]: float(prediction[0][i] * 100) for i in range(len(class_names))}
        
        return jsonify({
            "emotion": predicted_emotion,
            "confidence": round(confidence, 2),
            "all_probabilities": all_probabilities,
            "face_detected": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "running",
        "model_loaded": model is not None
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

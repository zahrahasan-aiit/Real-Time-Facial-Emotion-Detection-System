# Copy trained model to backend
# Run this after training the model in the Jupyter notebook

import shutil
import os

source = 'emotion_detection.h5'
destination = 'backend/emotion_detection.h5'

if os.path.exists(source):
    shutil.copy(source, destination)
    print(f"✓ Model copied to {destination}")
else:
    print("✗ Model file not found! Please train the model first by running all cells in the notebook.")

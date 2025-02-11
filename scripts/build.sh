#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Print system information
echo "System information:"
uname -a
pwd
ls -la

# Set up Python paths
PYTHON_PATH=$(which python3)
PYTHON_BIN_DIR="/python312/bin"
echo "Adding Python bin directory to PATH"
export PATH="$PYTHON_BIN_DIR:$PATH"

echo "Using Python at: $PYTHON_PATH"
$PYTHON_PATH --version

echo "Python pip version:"
$PYTHON_PATH -m pip --version

echo "Installing Python dependencies..."
$PYTHON_PATH -m pip install --upgrade pip
$PYTHON_PATH -m pip install --no-warn-script-location -r requirements.txt

echo "Installed Python packages:"
$PYTHON_PATH -m pip list

echo "Installing spaCy model..."
$PYTHON_PATH -m pip install --no-warn-script-location spacy
$PYTHON_PATH -m spacy download en_core_web_md

echo "Verifying Python environment:"
echo "PYTHONPATH=$PYTHONPATH"
echo "PATH=$PATH"
echo "Python bin contents:"
ls -la $PYTHON_BIN_DIR

echo "Verifying cloud dependencies..."
$PYTHON_PATH -c "
import os
from qdrant_client import QdrantClient

# Test cloud connection
client = QdrantClient(
    url=os.environ.get('QDRANT_URL', ''),
    api_key=os.environ.get('QDRANT_API_KEY', '')
)
print('Successfully connected to Qdrant cloud')
"

echo "Verifying spaCy installation..."
$PYTHON_PATH -c "import spacy; nlp = spacy.load('en_core_web_md'); print('spaCy model loaded successfully')"

echo "Current directory structure:"
ls -R

echo "Build script completed successfully"

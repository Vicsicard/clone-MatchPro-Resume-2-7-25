#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Print system information
echo "System information:"
uname -a
pwd
ls -la

PYTHON_PATH="/python312/bin/python3"
PYTHON_SITE_PACKAGES="/python312/lib/python3.12/site-packages"

echo "Adding Python bin to PATH"
export PATH="/python312/bin:$PATH"

echo "Checking Python installation..."
if [ -f "$PYTHON_PATH" ]; then
    echo "Python3 found at: $PYTHON_PATH"
    $PYTHON_PATH --version
else
    echo "Error: Python not found at $PYTHON_PATH"
    exit 1
fi

echo "Python pip version:"
$PYTHON_PATH -m pip --version

echo "Installing Python dependencies..."
$PYTHON_PATH -m pip install --upgrade pip
$PYTHON_PATH -m pip install -r requirements.txt

echo "Installed Python packages:"
$PYTHON_PATH -m pip list

echo "Installing spaCy model..."
$PYTHON_PATH -m spacy download en_core_web_md

echo "Verifying Python environment:"
echo "PYTHONPATH=$PYTHONPATH"
echo "PATH=$PATH"
echo "Python site-packages:"
ls -la $PYTHON_SITE_PACKAGES

echo "Verifying spaCy installation..."
$PYTHON_PATH -c "import spacy; nlp = spacy.load('en_core_web_md'); print('spaCy model loaded successfully')"

echo "Verifying other dependencies..."
$PYTHON_PATH -c "import cohere; print('cohere imported successfully')"
$PYTHON_PATH -c "import qdrant_client; print('qdrant_client imported successfully')"

echo "Current directory structure:"
ls -R

echo "Build script completed successfully"

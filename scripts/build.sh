#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Print system information
echo "System information:"
uname -a
pwd
ls -la

# Use python3 from PATH
PYTHON_PATH=$(which python3)
echo "Using Python at: $PYTHON_PATH"
$PYTHON_PATH --version

echo "Python pip version:"
$PYTHON_PATH -m pip --version

echo "Installing Python dependencies..."
$PYTHON_PATH -m pip install --upgrade pip
$PYTHON_PATH -m pip install -r requirements.txt

echo "Installed Python packages:"
$PYTHON_PATH -m pip list

echo "Installing spaCy model..."
$PYTHON_PATH -m pip install spacy
$PYTHON_PATH -m spacy download en_core_web_md

echo "Verifying Python environment:"
echo "PYTHONPATH=$PYTHONPATH"
echo "PATH=$PATH"

echo "Verifying SQLite installation..."
$PYTHON_PATH -c "import sqlite3; print('SQLite version:', sqlite3.sqlite_version)"

echo "Verifying spaCy installation..."
$PYTHON_PATH -c "import spacy; nlp = spacy.load('en_core_web_md'); print('spaCy model loaded successfully')"

echo "Verifying other dependencies..."
$PYTHON_PATH -c "import cohere; print('cohere imported successfully')"
$PYTHON_PATH -c "import qdrant_client; print('qdrant_client imported successfully')"

echo "Current directory structure:"
ls -R

echo "Build script completed successfully"

#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    apt-get update
    apt-get install -y python3 python3-pip
fi

echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "Installing spaCy model..."
python3 -m spacy download en_core_web_md

echo "Build script completed successfully"

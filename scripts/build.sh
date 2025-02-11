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

echo "Verifying cloud dependencies..."
$PYTHON_PATH -c "
import os
from qdrant_client import QdrantClient

# Test cloud connection
client = QdrantClient(
    location=os.environ.get('QDRANT_URL', ''),
    api_key=os.environ.get('QDRANT_API_KEY', ''),
    grpc_port=None  # Force HTTP mode
)

# Test the connection with a simple operation
collections = client.get_collections()
print('Qdrant collections:', collections)
print('Successfully connected to Qdrant cloud')
"

echo "Current directory structure:"
ls -R

echo "Build script completed successfully"

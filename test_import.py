import sys
print("Python version:", sys.version)
print("Python executable:", sys.executable)

try:
    import cohere
    print("Successfully imported cohere")
except Exception as e:
    print(f"Error importing cohere: {str(e)}")
    import traceback
    print(traceback.format_exc())

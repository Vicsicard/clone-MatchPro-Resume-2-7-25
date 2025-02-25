import sys
import os
from resume_matcher.scripts.similarity.get_similarity_score import get_similarity_score

def main():
    try:
        print("Starting test...", file=sys.stderr, flush=True)
        
        # Check environment variables
        cohere_key = os.getenv('COHERE_API_KEY')
        print(f"\nCOHERE_API_KEY present: {bool(cohere_key)}", file=sys.stderr, flush=True)
        if cohere_key:
            print(f"COHERE_API_KEY length: {len(cohere_key)}", file=sys.stderr, flush=True)
        
        text1 = "Python developer with experience in web development"
        text2 = "Looking for a Python developer with web development skills"
        
        print("\nTesting similarity between:", file=sys.stderr, flush=True)
        print(f"Text 1: {text1}", file=sys.stderr, flush=True)
        print(f"Text 2: {text2}", file=sys.stderr, flush=True)
        
        print("\nCalculating similarity...", file=sys.stderr, flush=True)
        result = get_similarity_score(text1, text2)
        
        print("\nResult:", file=sys.stderr, flush=True)
        print(result, file=sys.stderr, flush=True)
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}", file=sys.stderr, flush=True)
        print(traceback.format_exc(), file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()

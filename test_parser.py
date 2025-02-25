import sys
from resume_matcher.scripts.utils import read_single_pdf
from resume_matcher.scripts.parser import ParseDocumentToJson

def main():
    try:
        print("Starting test...", flush=True)
        
        resume_path = "test/sample_resume.txt"
        print(f"Reading file: {resume_path}", flush=True)
        
        content = read_single_pdf(resume_path)
        print(f"\nOriginal content length: {len(content)}", flush=True)
        
        print("\nParsing document...", flush=True)
        parser = ParseDocumentToJson(content, "resume")
        result = parser.get_JSON()
        
        print("\nParsed result:", flush=True)
        print(result, flush=True)
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()

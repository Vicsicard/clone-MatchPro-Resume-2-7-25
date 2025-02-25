import sys
import os
from resume_matcher.scripts.processor import process_files

def main():
    try:
        print("Starting analysis...", file=sys.stderr)
        
        resume_path = "test/sample_resume.txt"
        job_path = "test/sample_job.txt"
        
        print(f"\nProcessing files:", file=sys.stderr)
        print(f"Resume: {resume_path}", file=sys.stderr)
        print(f"Job: {job_path}", file=sys.stderr)
        
        result = process_files(
            resume_path=resume_path,
            job_path=job_path,
            mode='full',
            output_format='json'
        )
        
        print("\nResult:", file=sys.stderr)
        print(result, file=sys.stderr)
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

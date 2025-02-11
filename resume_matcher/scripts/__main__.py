import sys
import os
import json
import traceback
import argparse
from resume_matcher.scripts.processor import process_files

def main():
    try:
        print("Starting resume analysis...", file=sys.stderr, flush=True)
        
        parser = argparse.ArgumentParser(description='Process resume and job description files.')
        parser.add_argument('resume', help='Path to the resume file')
        parser.add_argument('job', help='Path to the job description file')
        parser.add_argument('--mode', default='full', choices=['full', 'basic'], help='Analysis mode')
        parser.add_argument('--output', default='json', choices=['json', 'text'], help='Output format')
        
        args = parser.parse_args()
        
        # Log input parameters
        print(f"Input parameters:", file=sys.stderr, flush=True)
        print(f"  Resume: {args.resume}", file=sys.stderr, flush=True)
        print(f"  Job Description: {args.job}", file=sys.stderr, flush=True)
        print(f"  Mode: {args.mode}", file=sys.stderr, flush=True)
        print(f"  Format: {args.output}", file=sys.stderr, flush=True)
        
        # Verify files exist
        if not os.path.exists(args.resume):
            raise FileNotFoundError(f"Resume file not found: {args.resume}")
        if not os.path.exists(args.job):
            raise FileNotFoundError(f"Job description file not found: {args.job}")
            
        print("Files verified, starting processing...", file=sys.stderr, flush=True)
        
        try:
            # Process the files and get analysis results
            result = process_files(
                resume_path=args.resume,
                job_path=args.job,
                mode=args.mode,
                output_format=args.output
            )
            print(f"Process files returned: {result}", file=sys.stderr, flush=True)
            
            # Print results to stdout
            print(json.dumps(result, indent=2))
            
        except Exception as e:
            print(f"Error in process_files: {str(e)}", file=sys.stderr, flush=True)
            print(f"Traceback: {traceback.format_exc()}", file=sys.stderr, flush=True)
            raise
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr, flush=True)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()

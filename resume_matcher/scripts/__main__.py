import sys
import os
import json
import traceback
import argparse
from resume_matcher.scripts.processor import process_files

def main():
    try:
        print("Starting resume analysis...", file=sys.stderr)
        
        parser = argparse.ArgumentParser(description='Process resume and job description files.')
        parser.add_argument('--input-resume', required=True, help='Path to the resume file')
        parser.add_argument('--input-job', required=True, help='Path to the job description file')
        parser.add_argument('--mode', default='full', choices=['full', 'basic'], help='Analysis mode')
        parser.add_argument('--format', default='json', choices=['json', 'text'], help='Output format')
        
        args = parser.parse_args()
        
        # Log input parameters
        print(f"Input parameters:", file=sys.stderr)
        print(f"  Resume: {args.input_resume}", file=sys.stderr)
        print(f"  Job Description: {args.input_job}", file=sys.stderr)
        print(f"  Mode: {args.mode}", file=sys.stderr)
        print(f"  Format: {args.format}", file=sys.stderr)
        
        # Verify files exist
        if not os.path.exists(args.input_resume):
            raise FileNotFoundError(f"Resume file not found: {args.input_resume}")
        if not os.path.exists(args.input_job):
            raise FileNotFoundError(f"Job description file not found: {args.input_job}")
            
        print("Files verified, starting processing...", file=sys.stderr)
        
        # Process the files and get analysis results
        result = process_files(
            resume_path=args.input_resume,
            job_path=args.input_job,
            mode=args.mode,
            output_format=args.format
        )
        
        # Check for errors
        if 'error' in result:
            print(f"Error in processing: {result['error']}", file=sys.stderr)
            print(json.dumps({'error': result['error']}), file=sys.stderr)
            sys.exit(1)
            
        print("Processing completed successfully", file=sys.stderr)
        
        # Print results as JSON to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

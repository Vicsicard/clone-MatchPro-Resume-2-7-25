import sys
import json
import argparse
from resume_matcher.scripts.processor import process_files

def main():
    parser = argparse.ArgumentParser(description='Process resume and job description files.')
    parser.add_argument('--input-resume', required=True, help='Path to the resume file')
    parser.add_argument('--input-job', required=True, help='Path to the job description file')
    parser.add_argument('--mode', default='full', choices=['full', 'basic'], help='Analysis mode')
    parser.add_argument('--format', default='json', choices=['json', 'text'], help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Process the files and get analysis results
        result = process_files(
            resume_path=args.input_resume,
            job_path=args.input_job,
            mode=args.mode,
            output_format=args.format
        )
        
        # Check for errors
        if 'error' in result:
            print(json.dumps({'error': result['error']}), file=sys.stderr)
            sys.exit(1)
            
        # Print results as JSON to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

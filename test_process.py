import sys
import traceback
from resume_matcher.scripts.processor import process_files

def main():
    with open('debug.log', 'w') as f:
        try:
            f.write("Starting test...\n")
            f.flush()
            
            resume_path = "test/sample_resume.txt"
            job_path = "test/sample_job.txt"
            
            f.write(f"Processing files:\n")
            f.write(f"Resume: {resume_path}\n")
            f.write(f"Job: {job_path}\n")
            f.flush()
            
            result = process_files(
                resume_path=resume_path,
                job_path=job_path,
                mode='full',
                output_format='json'
            )
            
            f.write("\nResult:\n")
            f.write(str(result))
            f.write("\n")
            f.flush()
            
        except Exception as e:
            f.write(f"Error: {str(e)}\n")
            f.write(traceback.format_exc())
            f.write("\n")
            f.flush()
            sys.exit(1)

if __name__ == '__main__':
    main()

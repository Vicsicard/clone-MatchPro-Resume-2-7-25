import json
import os
import sys
import traceback
from resume_matcher.scripts.parser import ParseDocumentToJson
from resume_matcher.scripts.utils import read_single_pdf
from resume_matcher.scripts.similarity.get_similarity_score import get_similarity_score

class Processor:
    def __init__(self, input_file, file_type):
        self.input_file = input_file
        self.file_type = file_type
        self.data = None

    def process(self) -> dict:
        """Process the input file and return results as a dictionary"""
        try:
            print(f"Processing {self.file_type} file: {self.input_file}", file=sys.stderr)
            # Read and parse the document
            data = read_single_pdf(self.input_file)
            print(f"Successfully read {self.file_type} file", file=sys.stderr)
            
            self.data = ParseDocumentToJson(data, self.file_type).get_JSON()
            print(f"Successfully parsed {self.file_type} data", file=sys.stderr)
            
            return self.data
        except Exception as e:
            error_msg = f"Error processing {self.file_type}: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr)
            return {"error": str(e)}

def process_files(resume_path: str, job_path: str, mode: str = 'full', output_format: str = 'json') -> dict:
    """
    Process resume and job description files and return analysis results
    
    Args:
        resume_path: Path to the resume file
        job_path: Path to the job description file
        mode: Analysis mode ('full' or 'basic')
        output_format: Output format ('json' or 'text')
        
    Returns:
        Dictionary containing analysis results
    """
    try:
        # Step 1: Initialize
        print("Step 1/8: Initializing analysis...", file=sys.stderr)
        
        # Step 2: Process resume
        print("Step 2/8: Processing resume document...", file=sys.stderr)
        resume_processor = Processor(resume_path, "resume")
        resume_data = resume_processor.process()
        if "error" in resume_data:
            return {"error": f"Resume processing failed: {resume_data['error']}"}
        print("Resume document processed successfully", file=sys.stderr)
        
        # Step 3: Process job description
        print("Step 3/8: Processing job description document...", file=sys.stderr)
        job_processor = Processor(job_path, "job_description")
        job_data = job_processor.process()
        if "error" in job_data:
            return {"error": f"Job description processing failed: {job_data['error']}"}
        print("Job description processed successfully", file=sys.stderr)
        
        # Step 4: Extract key information
        print("Step 4/8: Extracting key information...", file=sys.stderr)
        resume_text = resume_data.get("clean_data", "")
        job_text = job_data.get("clean_data", "")
        
        if not resume_text or not job_text:
            return {"error": "Failed to extract clean text from documents"}
        
        # Step 5: Get similarity score
        print("Step 5/8: Calculating similarity score...", file=sys.stderr)
        similarity_score = get_similarity_score(resume_text, job_text)
        
        # Step 6: Prepare results
        print("Step 6/8: Preparing results...", file=sys.stderr)
        results = {
            "similarity_score": similarity_score,
            "resume_data": resume_data,
            "job_data": job_data,
            "mode": mode
        }
        
        # Step 7: Format output
        print("Step 7/8: Formatting output...", file=sys.stderr)
        if output_format == 'json':
            output = json.dumps(results, indent=2)
        else:
            output = f"""
            Analysis Results:
            ----------------
            Similarity Score: {similarity_score}
            
            Resume Information:
            - Keywords: {', '.join(resume_data.get('extracted_keywords', []))}
            - Key Terms: {', '.join(resume_data.get('keyterms', []))}
            
            Job Description Information:
            - Keywords: {', '.join(job_data.get('extracted_keywords', []))}
            - Key Terms: {', '.join(job_data.get('keyterms', []))}
            """
        
        # Step 8: Return results
        print("Step 8/8: Analysis completed successfully", file=sys.stderr)
        return {"success": True, "results": output}
        
    except Exception as e:
        error_msg = f"Error in process_files: {str(e)}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr)
        return {"error": str(e)}

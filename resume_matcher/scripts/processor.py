import sys
from typing import Dict, List, Optional

from resume_matcher.scripts.parser import ParseDocumentToJson
from resume_matcher.scripts.similarity.get_similarity_score import get_similarity_score
from resume_matcher.scripts.utils import read_single_pdf

class Processor:
    def __init__(self, file_path: str, doc_type: str):
        """
        Initialize the processor with file path and document type.
        
        Args:
            file_path (str): Path to the document file
            doc_type (str): Type of document ('resume' or 'job')
        """
        print(f"Initializing processor for {doc_type}: {file_path}", file=sys.stderr)
        self.file_path = file_path
        self.doc_type = doc_type
        self.doc_data = None
        self.parsed_data = None

    def process(self) -> Optional[Dict]:
        """
        Process the document file and return parsed data.
        
        Returns:
            Dict: Parsed document data or None if processing fails
        """
        try:
            print(f"\nProcessing {self.doc_type}...", file=sys.stderr)
            
            # Read file
            print(f"Reading file: {self.file_path}", file=sys.stderr)
            self.doc_data = read_single_pdf(self.file_path)
            print(f"Successfully read file ({len(self.doc_data)} characters)", file=sys.stderr)
            
            # Parse document
            print("Parsing document...", file=sys.stderr)
            parser = ParseDocumentToJson(self.doc_data, self.doc_type)
            self.parsed_data = parser.get_JSON()
            print("Successfully parsed document", file=sys.stderr)
            
            return self.parsed_data
            
        except Exception as e:
            print(f"Error processing {self.doc_type}: {str(e)}", file=sys.stderr)
            import traceback
            print(traceback.format_exc(), file=sys.stderr)
            return None

def process_files(resume_path: str, job_path: str, mode: str = 'full', output_format: str = 'json') -> Dict:
    """
    Process resume and job description files and calculate similarity.
    
    Args:
        resume_path (str): Path to resume file
        job_path (str): Path to job description file
        mode (str): Processing mode ('full' or 'quick')
        output_format (str): Output format ('json' or 'text')
        
    Returns:
        Dict: Results including similarity score and processed data
    """
    try:
        print("\nStarting file processing...", file=sys.stderr)
        
        # Process resume
        resume_processor = Processor(resume_path, "resume")
        resume_data = resume_processor.process()
        if not resume_data:
            raise ValueError("Failed to process resume")
            
        # Process job description
        job_processor = Processor(job_path, "job")
        job_data = job_processor.process()
        if not job_data:
            raise ValueError("Failed to process job description")
            
        # Calculate similarity
        print("\nCalculating similarity score...", file=sys.stderr)
        similarity_score = get_similarity_score(
            resume_text=resume_data['clean_data'],
            job_text=job_data['clean_data']
        )
        print(f"Similarity calculation complete", file=sys.stderr)
        
        # Prepare output
        result = {
            'similarity': similarity_score[0]['score'],
            'resume_data': resume_data,
            'job_data': job_data
        }
        
        if output_format == 'text':
            return _format_output_as_text(result)
        return result
        
    except Exception as e:
        print(f"Error in process_files: {str(e)}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        raise

def _format_output_as_text(result: Dict) -> Dict:
    """Format the output as human-readable text."""
    return {
        'similarity': f"Similarity Score: {result['similarity']:.2%}",
        'resume_data': {
            'name': result['resume_data'].get('name', 'Not found'),
            'experience': result['resume_data'].get('experience', 'Not found'),
            'skills': result['resume_data'].get('extracted_keywords', [])
        },
        'job_data': {
            'keywords': result['job_data'].get('extracted_keywords', []),
            'requirements': result['job_data'].get('keyterms', [])
        }
    }

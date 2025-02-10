import json
import os
from resume_matcher.scripts.parser import ParseDocumentToJson
from resume_matcher.scripts.utils import read_single_pdf
from scripts.similarity.get_similarity_score import get_similarity_score

class Processor:
    def __init__(self, input_file, file_type):
        self.input_file = input_file
        self.file_type = file_type
        self.data = None

    def process(self) -> dict:
        """Process the input file and return results as a dictionary"""
        try:
            # Read and parse the document
            data = read_single_pdf(self.input_file)
            self.data = ParseDocumentToJson(data, self.file_type).get_JSON()
            return self.data
        except Exception as e:
            print(f"An error occurred: {str(e)}")
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
        # Process resume and job description
        resume_processor = Processor(resume_path, "resume")
        job_processor = Processor(job_path, "job_description")
        
        resume_data = resume_processor.process()
        job_data = job_processor.process()
        
        if not resume_data or not job_data:
            raise Exception("Failed to process files")

        # Extract keywords for similarity scoring
        resume_keywords = resume_data.get("extracted_keywords", [])
        job_keywords = job_data.get("extracted_keywords", [])
        
        # Get similarity score
        resume_string = " ".join(resume_keywords)
        job_string = " ".join(job_keywords)
        similarity_results = get_similarity_score(resume_string, job_string)
        
        # Calculate match score (take the first score if available)
        match_score = similarity_results[0]["score"] if similarity_results else 0.0
        
        # Extract key information
        skills = resume_data.get("keyterms", [])
        experience = resume_data.get("experience", "")
        contact_info = {
            "name": resume_data.get("name", []),
            "email": resume_data.get("emails", []),
            "phone": resume_data.get("phones", [])
        }
        
        # Generate recommendations based on match score
        recommendations = []
        if match_score < 0.6:
            recommendations.append("Consider adding more relevant keywords from the job description")
        if not skills:
            recommendations.append("Add a clear skills section to your resume")
        if not experience:
            recommendations.append("Include detailed work experience")
            
        # Prepare the final analysis result
        analysis_result = {
            "match_score": match_score,
            "key_terms": skills,
            "skills_analysis": {
                "matched_skills": [skill for skill in skills if any(job_skill in skill.lower() for job_skill in job_keywords)],
                "missing_skills": [skill for skill in job_keywords if not any(resume_skill in skill.lower() for resume_skill in resume_keywords)]
            },
            "experience_analysis": experience,
            "contact_information": contact_info,
            "recommendations": recommendations,
            "details": {
                "resume_keywords": resume_keywords,
                "job_keywords": job_keywords,
                "similarity_details": similarity_results
            }
        }
        
        return analysis_result
        
    except Exception as e:
        print(f"Error in process_files: {str(e)}")
        return {"error": str(e)}

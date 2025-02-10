import json
import os
import sys
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
        print("Step 1/4: Processing resume...", file=sys.stderr)
        resume_processor = Processor(resume_path, "resume")
        resume_data = resume_processor.process()
        print("Resume processed successfully", file=sys.stderr)
        
        print("Step 2/4: Processing job description...", file=sys.stderr)
        job_processor = Processor(job_path, "job_description")
        job_data = job_processor.process()
        print("Job description processed successfully", file=sys.stderr)
        
        if not resume_data or not job_data:
            raise Exception("Failed to process files")

        try:
            # Extract keywords for similarity scoring
            resume_keywords = resume_data.get("extracted_keywords", [])
            if isinstance(resume_keywords, tuple):
                resume_keywords = list(resume_keywords)
            elif not isinstance(resume_keywords, list):
                resume_keywords = [str(resume_keywords)]

            job_keywords = job_data.get("extracted_keywords", [])
            if isinstance(job_keywords, tuple):
                job_keywords = list(job_keywords)
            elif not isinstance(job_keywords, list):
                job_keywords = [str(job_keywords)]
            
            print("Step 3/4: Calculating similarity score...", file=sys.stderr)
            resume_string = " ".join(str(kw) for kw in resume_keywords)
            job_string = " ".join(str(kw) for kw in job_keywords)
            similarity_results = get_similarity_score(resume_string, job_string)
            print("Similarity score calculated", file=sys.stderr)
            
            # Calculate match score (take the first score if available)
            match_score = float(similarity_results[0]["score"]) if similarity_results else 0.0
            
            # Extract text from similarity results for skills comparison
            resume_text = similarity_results[0]["text"] if similarity_results else ""
            
            # Clean up keywords
            resume_keywords = [kw.strip() for kw in resume_keywords if isinstance(kw, (str, int, float))]
            job_keywords = list(set(kw.strip() for kw in job_keywords if isinstance(kw, (str, int, float))))
        except Exception as e:
            print(f"Error processing keywords: {str(e)}")
            resume_keywords = []
            job_keywords = []
            match_score = 0.0
            resume_text = ""
        
        # Extract key information
        skills = resume_data.get("keyterms", [])
        experience = resume_data.get("experience", "")
        contact_info = {
            "name": resume_data.get("name", []),
            "email": resume_data.get("emails", []),
            "phone": resume_data.get("phones", [])
        }
        
        # Clean up skills list
        if isinstance(skills, (list, tuple)):
            skills = [str(skill).split('(')[0].strip() for skill in skills]
            # Remove any empty strings or very short skills
            skills = [skill for skill in skills if len(skill) > 2]
        else:
            skills = []
            
        # Generate recommendations based on match score and analysis
        recommendations = []
        if match_score < 0.6:
            recommendations.append("Consider adding more relevant keywords from the job description")
        if not skills:
            recommendations.append("Add a clear skills section to your resume")
        if not experience:
            recommendations.append("Include detailed work experience")
        
        # Define technical keywords to focus on
        technical_keywords = {
            'javascript', 'react', 'vue', 'angular', 'html', 'css', 'git', 
            'jquery', 'frontend', 'backend', 'fullstack', 'api', 'rest',
            'web', 'development', 'programming', 'software', 'engineering',
            'computer science', 'database', 'testing', 'ci/cd', 'agile'
        }
        
        # Add specific skill recommendations
        missing_skills = [str(skill) for skill in job_keywords 
                         if str(skill).lower() not in resume_text.lower() 
                         and len(str(skill)) > 2  # Filter out short words
                         and not str(skill).lower() in ['the', 'and', 'for', 'with', 'job', 'description', '•']  # Filter common words
                         and not any(char in '•' for char in skill)]  # Remove bullet points
        # Filter for technical skills
        technical_missing_skills = [skill for skill in missing_skills 
                                  if any(tech.lower() in skill.lower() for tech in technical_keywords)]
        
        if technical_missing_skills:
            recommendations.append(f"Consider adding these technical skills: {', '.join(technical_missing_skills[:5])}")
            
        # Format skills for frontend display
        matched_skills = [skill for skill in skills 
                         if any(str(job_skill).lower() in str(skill).lower() 
                               for job_skill in job_keywords)
                         and len(skill.strip()) > 2]
        
        # Create skills object for frontend
        skills_analysis = {}
        for skill in matched_skills + technical_missing_skills:
            skills_analysis[skill] = skill in matched_skills
        
        print("Step 4/4: Preparing final analysis...", file=sys.stderr)
        # Prepare the final analysis result matching frontend expectations
        analysis_result = {
            "score": match_score,
            "keyTerms": skills,
            "skills": skills_analysis,
            "experience": experience,
            "contactInfo": {
                "name": contact_info["name"][0] if contact_info["name"] else "",
                "email": contact_info["email"][0] if contact_info["email"] else "",
                "phone": contact_info["phone"][0] if contact_info["phone"] else ""
            },
            "recommendations": recommendations,
            "details": json.dumps({
                "resumeKeywords": resume_keywords,
                "jobKeywords": job_keywords,
                "similarityDetails": similarity_results
            }, indent=2)
        }
        
        return analysis_result
        
    except Exception as e:
        print(f"Error in process_files: {str(e)}")
        return {"error": str(e)}

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from typing import List
import nltk
from scripts.similarity.get_score import get_score
from scripts.utils import get_filenames_from_dir, read_json
from scripts import JobDescriptionProcessor, ResumeProcessor

# Download required NLTK data
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

app = FastAPI(title="Resume Matcher API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
async def root():
    return {"message": "Welcome to Resume Matcher API"}

@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: UploadFile = File(...)
):
    try:
        # Create temporary directory for processing
        os.makedirs("temp", exist_ok=True)
        
        # Save uploaded files
        resume_path = f"temp/{resume.filename}"
        jd_path = f"temp/{job_description.filename}"
        
        with open(resume_path, "wb") as f:
            content = await resume.read()
            f.write(content)
        
        with open(jd_path, "wb") as f:
            content = await job_description.read()
            f.write(content)
        
        # Process files
        resume_processor = ResumeProcessor(resume_path)
        jd_processor = JobDescriptionProcessor(jd_path)
        
        resume_data = resume_processor.process()
        jd_data = jd_processor.process()
        
        # Get similarity score
        resume_keywords = resume_data["extracted_keywords"]
        jd_keywords = jd_data["extracted_keywords"]
        
        resume_string = " ".join(resume_keywords)
        jd_string = " ".join(jd_keywords)
        
        final_result = get_score(resume_string, jd_string)
        
        # Clean up
        os.remove(resume_path)
        os.remove(jd_path)
        
        return {
            "score": final_result[0].score,
            "resume_keywords": resume_keywords,
            "jd_keywords": jd_keywords,
            "resume_data": resume_data,
            "jd_data": jd_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sample-data")
async def get_sample_data():
    """Get list of sample resumes and job descriptions"""
    try:
        resume_dir = "Data/Processed/Resumes"
        jd_dir = "Data/Processed/JobDescription"
        
        resumes = get_filenames_from_dir(resume_dir)
        job_descriptions = get_filenames_from_dir(jd_dir)
        
        return {
            "resumes": resumes,
            "job_descriptions": job_descriptions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

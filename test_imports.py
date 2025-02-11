import sys
import os
import json
import traceback
import argparse
from resume_matcher.scripts.processor import process_files
from resume_matcher.scripts.utils import read_single_pdf

print("All imports successful!")

print("Testing file reading...")
resume_path = "c:/Users/dell/MatchPro-Resume-2-7-25/test/sample_resume.txt"
job_path = "c:/Users/dell/MatchPro-Resume-2-7-25/test/sample_job.txt"

print(f"Reading resume from {resume_path}")
resume_text = read_single_pdf(resume_path)
print(f"Resume text: {resume_text[:100]}...")

print(f"\nReading job description from {job_path}")
job_text = read_single_pdf(job_path)
print(f"Job text: {job_text[:100]}...")

print("\nProcessing files...")
result = process_files(resume_path, job_path, mode='full', output_format='json')
print(f"Result: {json.dumps(result, indent=2)}")

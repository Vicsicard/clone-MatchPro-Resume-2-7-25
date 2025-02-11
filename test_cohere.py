import os
import sys
import cohere
import traceback
from resume_matcher.scripts.utils import read_single_pdf

def main():
    with open('cohere_test.log', 'w') as log:
        try:
            log.write("Starting test...\n")
            log.flush()
            
            # Check environment variables
            api_key = os.getenv('COHERE_API_KEY')
            log.write(f"\nCOHERE_API_KEY present: {bool(api_key)}\n")
            if api_key:
                log.write(f"COHERE_API_KEY length: {len(api_key)}\n")
            log.flush()
            
            # Read files
            resume_path = "test/sample_resume.txt"
            job_path = "test/sample_job.txt"
            
            log.write("\nReading files...\n")
            resume_text = read_single_pdf(resume_path)
            job_text = read_single_pdf(job_path)
            
            log.write(f"Resume length: {len(resume_text)}\n")
            log.write(f"Job description length: {len(job_text)}\n")
            log.flush()
            
            # Initialize client
            log.write("\nInitializing Cohere client...\n")
            co = cohere.Client(api_key)
            log.flush()
            
            # Get embeddings
            log.write("\nGetting embeddings...\n")
            response = co.embed(
                texts=[resume_text, job_text],
                model='embed-english-v3.0',
                input_type='search_document'
            )
            
            embeddings = response.embeddings
            log.write(f"\nGot {len(embeddings)} embeddings\n")
            log.write(f"Embedding dimensions: {len(embeddings[0])}\n")
            log.flush()
            
            # Calculate similarity
            log.write("\nCalculating similarity...\n")
            
            # Dot product
            dot_product = sum(a * b for a, b in zip(embeddings[0], embeddings[1]))
            
            # Magnitudes
            magnitude1 = sum(x * x for x in embeddings[0]) ** 0.5
            magnitude2 = sum(x * x for x in embeddings[1]) ** 0.5
            
            # Cosine similarity
            similarity = dot_product / (magnitude1 * magnitude2)
            
            log.write(f"\nSimilarity score: {similarity}\n")
            log.flush()
            
        except Exception as e:
            log.write(f"\nError: {str(e)}\n")
            log.write(traceback.format_exc())
            log.write("\n")
            log.flush()
            sys.exit(1)

if __name__ == '__main__':
    main()

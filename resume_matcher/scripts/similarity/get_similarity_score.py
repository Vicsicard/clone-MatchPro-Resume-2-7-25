import os
import sys
import cohere
import traceback
from typing import List, Dict

def get_similarity_score(resume_text: str, job_text: str) -> List[Dict]:
    """
    Calculate similarity score between resume and job description using Cohere API
    
    Args:
        resume_text: Text extracted from resume
        job_text: Text extracted from job description
        
    Returns:
        List of dictionaries containing similarity scores and text
    """
    try:
        print("Starting similarity score calculation...", file=sys.stderr)
        
        # Initialize Cohere client
        api_key = os.getenv('COHERE_API_KEY')
        if not api_key:
            print("Error: COHERE_API_KEY environment variable not set", file=sys.stderr)
            raise ValueError("COHERE_API_KEY environment variable not set")
            
        print("Initializing Cohere client...", file=sys.stderr)
        co = cohere.Client(api_key)
        
        # Get embeddings for both texts
        print("Getting embeddings for texts...", file=sys.stderr)
        print(f"Resume text length: {len(resume_text)}", file=sys.stderr)
        print(f"Job text length: {len(job_text)}", file=sys.stderr)
        
        embeddings = co.embed(
            texts=[resume_text, job_text],
            model='embed-english-v3.0',
            input_type='search_document'
        ).embeddings
        
        if len(embeddings) != 2:
            print(f"Error: Expected 2 embeddings, got {len(embeddings)}", file=sys.stderr)
            raise ValueError("Failed to generate embeddings for both texts")
            
        print("Successfully generated embeddings", file=sys.stderr)
        
        # Calculate cosine similarity
        resume_embedding = embeddings[0]
        job_embedding = embeddings[1]
        
        print("Calculating cosine similarity...", file=sys.stderr)
        
        # Dot product
        dot_product = sum(a * b for a, b in zip(resume_embedding, job_embedding))
        
        # Magnitudes
        resume_magnitude = sum(x * x for x in resume_embedding) ** 0.5
        job_magnitude = sum(x * x for x in job_embedding) ** 0.5
        
        # Cosine similarity
        similarity = dot_product / (resume_magnitude * job_magnitude)
        
        print(f"Calculated similarity score: {similarity}", file=sys.stderr)
        
        return [{
            "score": similarity,
            "text": resume_text
        }]
        
    except Exception as e:
        error_msg = f"Error calculating similarity score: {str(e)}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr)
        raise

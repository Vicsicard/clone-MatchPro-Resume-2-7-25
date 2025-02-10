import os
import cohere
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
        # Initialize Cohere client
        api_key = os.getenv('COHERE_API_KEY')
        if not api_key:
            raise ValueError("COHERE_API_KEY environment variable not set")
            
        co = cohere.Client(api_key)
        
        # Get embeddings for both texts
        embeddings = co.embed(
            texts=[resume_text, job_text],
            model='embed-english-v3.0'
        ).embeddings
        
        if len(embeddings) != 2:
            raise ValueError("Failed to generate embeddings for both texts")
            
        # Calculate cosine similarity
        resume_embedding = embeddings[0]
        job_embedding = embeddings[1]
        
        # Dot product
        dot_product = sum(a * b for a, b in zip(resume_embedding, job_embedding))
        
        # Magnitudes
        resume_magnitude = sum(x * x for x in resume_embedding) ** 0.5
        job_magnitude = sum(x * x for x in job_embedding) ** 0.5
        
        # Cosine similarity
        similarity = dot_product / (resume_magnitude * job_magnitude)
        
        return [{
            "score": similarity,
            "text": resume_text
        }]
        
    except Exception as e:
        print(f"Error calculating similarity score: {str(e)}")
        return [{"score": 0.0, "text": resume_text}]

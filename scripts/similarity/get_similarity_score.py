import json
import logging
import os
import sys
import cohere
import yaml
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Batch
from scripts.utils.logger import get_handlers, init_logging_config

init_logging_config(basic_log_level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
stderr_handler, file_handler = get_handlers()

class QdrantSearch:
    def __init__(self, resumes, jd):
        """Initialize QdrantSearch with resume and job description texts."""
        print("Initializing similarity analysis...", file=sys.stderr)
        # Get API keys from environment variables
        self.cohere_key = os.getenv('COHERE_API_KEY')
        self.qdrant_key = os.getenv('QDRANT_API_KEY')
        self.qdrant_url = os.getenv('QDRANT_URL')
        
        if not self.cohere_key:
            raise ValueError("COHERE_API_KEY environment variable is not set")
        if not self.qdrant_key:
            raise ValueError("QDRANT_API_KEY environment variable is not set")
        if not self.qdrant_url:
            raise ValueError("QDRANT_URL environment variable is not set")
            
        self.resumes = resumes
        self.jd = jd
        
        # Initialize clients
        try:
            print("Connecting to Cohere and Qdrant...", file=sys.stderr)
            self.cohere = cohere.Client(self.cohere_key)
            self.collection_name = "resume_collection_name"
            self.qdrant = QdrantClient(
                url=self.qdrant_url,
                api_key=self.qdrant_key,
            )

            # Check if collection exists, create only if it doesn't
            collections = self.qdrant.get_collections()
            collection_exists = any(col.name == self.collection_name for col in collections.collections)
            
            if not collection_exists:
                vector_size = 4096
                print("Creating new vector collection...", file=sys.stderr)
                self.qdrant.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=vector_size, 
                        distance=models.Distance.COSINE
                    ),
                )
            else:
                print("Resetting existing vector collection...", file=sys.stderr)
                # Clear existing points
                self.qdrant.delete_collection(self.collection_name)
                self.qdrant.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=vector_size, 
                        distance=models.Distance.COSINE
                    ),
                )
            print("Vector collection ready", file=sys.stderr)
        except Exception as e:
            logger.error(f"Failed to initialize clients: {str(e)}", exc_info=True)
            raise

    def get_embedding(self, text):
        """Get text embeddings using Cohere API."""
        try:
            print("Generating embeddings using Cohere API...", file=sys.stderr)
            response = self.cohere.embed(texts=[text], model="large")
            embeddings = list(map(float, response.embeddings[0]))
            print("Embeddings generated successfully", file=sys.stderr)
            return embeddings
        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}", exc_info=True)
            raise

    def update_qdrant(self):
        """Update Qdrant collection with resume vectors."""
        try:
            print("Updating Qdrant collection with vectors...", file=sys.stderr)
            vectors = []
            ids = []
            for i, resume in enumerate(self.resumes):
                vector = self.get_embedding(resume)
                vectors.append(vector)
                ids.append(i)
            
            self.qdrant.upsert(
                collection_name=self.collection_name,
                points=Batch(
                    ids=ids,
                    vectors=vectors,
                    payloads=[{"text": resume} for resume in self.resumes],
                ),
            )
            print("Vectors uploaded to Qdrant successfully", file=sys.stderr)
        except Exception as e:
            logger.error(f"Error updating Qdrant collection: {str(e)}", exc_info=True)
            raise

    def search(self):
        """Search for similar resumes using job description."""
        try:
            print("Performing similarity search in Qdrant...", file=sys.stderr)
            vector = self.get_embedding(self.jd)
            hits = self.qdrant.search(
                collection_name=self.collection_name,
                query_vector=vector,
                limit=30
            )
            
            results = []
            for hit in hits:
                result = {
                    "text": str(hit.payload.get("text", ""))[:100],  # Get first 100 chars for preview
                    "score": float(hit.score)  # Ensure score is a float
                }
                results.append(result)
            
            print(f"Search completed. Found {len(results)} matches", file=sys.stderr)
            return results
        except Exception as e:
            logger.error(f"Error performing search: {str(e)}", exc_info=True)
            raise

def get_similarity_score(resume_string, job_description_string):
    """Calculate similarity score between resume and job description."""
    try:
        print("Starting similarity analysis...", file=sys.stderr)
        
        if not resume_string or not job_description_string:
            raise ValueError("Resume and job description strings cannot be empty")
            
        qdrant_search = QdrantSearch([resume_string], job_description_string)
        qdrant_search.update_qdrant()
        search_result = qdrant_search.search()
        
        print("Similarity analysis completed successfully", file=sys.stderr)
        return search_result
        
    except Exception as e:
        logger.error(f"Error in similarity analysis: {str(e)}", exc_info=True)
        raise

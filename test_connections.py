import os
import cohere
from qdrant_client import QdrantClient
from dotenv import load_dotenv

def test_connections():
    print("Loading environment variables...")
    load_dotenv('.env.local')
    
    # Test Cohere
    print("\nTesting Cohere connection...")
    cohere_api_key = os.getenv('COHERE_API_KEY')
    if not cohere_api_key:
        print("❌ COHERE_API_KEY not found in environment")
        return
    
    try:
        co = cohere.Client(cohere_api_key)
        response = co.embed(texts=["Test connection"])
        print("✅ Successfully connected to Cohere")
    except Exception as e:
        print(f"❌ Failed to connect to Cohere: {str(e)}")
        return
    
    # Test Qdrant
    print("\nTesting Qdrant connection...")
    qdrant_url = os.getenv('QDRANT_URL')
    qdrant_api_key = os.getenv('QDRANT_API_KEY')
    
    if not qdrant_url or not qdrant_api_key:
        print("❌ QDRANT_URL or QDRANT_API_KEY not found in environment")
        return
    
    try:
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )
        # List collections to test connection
        collections = client.get_collections()
        print("✅ Successfully connected to Qdrant")
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {str(e)}")
        return
    
    print("\n🎉 All connections successful!")

if __name__ == "__main__":
    test_connections()

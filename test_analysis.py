import os
from dotenv import load_dotenv
from resume_matcher.scripts.processor import process_files

def test_analysis():
    try:
        print("Starting resume analysis test...")
        
        # Load environment variables
        print("Loading environment variables...")
        load_dotenv('.env.local')
        
        # Verify environment variables
        required_vars = ['COHERE_API_KEY', 'QDRANT_API_KEY', 'QDRANT_URL']
        for var in required_vars:
            if not os.getenv(var):
                raise ValueError(f"Missing required environment variable: {var}")
        print("Environment variables loaded successfully")
    
        # Test file paths
        resume_path = os.path.join('Data', 'Resumes', 'barry_allen_fe.pdf')
        job_path = os.path.join('Data', 'JobDescription', 'job_desc_front_end_engineer.pdf')
        
        # Verify files exist
        if not os.path.exists(resume_path):
            raise FileNotFoundError(f"Resume file not found: {resume_path}")
        if not os.path.exists(job_path):
            raise FileNotFoundError(f"Job description file not found: {job_path}")
        
        print(f"\nProcessing files:")
        print(f"Resume: {resume_path}")
        print(f"Job Description: {job_path}")
        
        print("\nInitiating analysis...")
        # Run the analysis
        result = process_files(
            resume_path=resume_path,
            job_path=job_path,
            mode='full',
            output_format='json'
        )
        if not result:
            raise ValueError("Analysis returned no results")
            
        # Print results
        print("\nAnalysis Results:")
        print(f"Match Score: {result.get('match_score', 'N/A')}")
        print("\nMatched Skills:")
        for skill in result.get('skills_analysis', {}).get('matched_skills', []):
            print(f"- {skill}")
        print("\nMissing Skills:")
        for skill in result.get('skills_analysis', {}).get('missing_skills', []):
            print(f"- {skill}")
        print("\nRecommendations:")
        for rec in result.get('recommendations', []):
            print(f"- {rec}")
            
        print("\n✅ Analysis completed successfully!")
            
    except FileNotFoundError as e:
        print(f"\n❌ File Error: {str(e)}")
        raise
    except ValueError as e:
        print(f"\n❌ Value Error: {str(e)}")
        raise
    except Exception as e:
        print(f"\n❌ Unexpected Error: {str(e)}")
        import traceback
        print("\nFull error traceback:")
        print(traceback.format_exc())
        raise

if __name__ == "__main__":
    test_analysis()

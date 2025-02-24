import { CohereClient } from 'cohere-ai';

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Type definitions
export interface CohereAnalysisResult {
  suggestions: Array<{
    suggestion: string;
    details: string;
  }>;
  similarityScore: number;
}

export class CohereService {
  private client: CohereClient;
  private static instance: CohereService;

  private constructor(apiKey: string) {
    this.client = new CohereClient({
      token: apiKey
    });
  }

  public static getInstance(apiKey: string): CohereService {
    if (!CohereService.instance) {
      CohereService.instance = new CohereService(apiKey);
    }
    return CohereService.instance;
  }

  private async retry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying operation, ${retries} attempts remaining...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  public async analyzeResume(resumeText: string, jobDescText: string): Promise<CohereAnalysisResult> {
    try {
      // Get suggestions using chat
      const chatResponse = await this.retry(() => 
        this.client.chat({
          message: `You are a professional resume analyzer. Analyze the resume and provide suggestions for improvement based on the job description.

Resume Text:
${resumeText}

Job Description:
${jobDescText}

Please provide specific, actionable suggestions for improving this resume to better match the job description. Focus on:
1. Skills alignment
2. Experience relevance
3. Missing keywords
4. Format and presentation
5. Overall fit

Format your response as a JSON array of suggestions, each with a 'suggestion' title and 'details' explanation. Example:
[
  {
    "suggestion": "Add missing technical skills",
    "details": "Include Python and SQL skills as they are explicitly required in the job description"
  }
]`,
          model: 'command',
        })
      );

      // Get embeddings for similarity calculation
      const embedResponse = await this.retry(() =>
        this.client.embed({
          texts: [resumeText, jobDescText],
          model: 'embed-english-v3.0',
          inputType: 'search_document'
        })
      );

      // Calculate similarity score
      const similarityScore = this.calculateCosineSimilarity(
        embedResponse.embeddings[0],
        embedResponse.embeddings[1]
      );

      // Parse suggestions from chat response
      let suggestions;
      try {
        const jsonMatch = chatResponse.text.match(/\[[\s\S]*\]/);
        suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (error) {
        console.error('Failed to parse suggestions:', error);
        suggestions = [];
      }

      return {
        suggestions: suggestions.slice(0, 5), // Limit to 5 suggestions
        similarityScore
      };
    } catch (error) {
      console.error('Cohere analysis failed:', error);
      throw new Error(`Failed to analyze resume: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// Export a function to get the service instance
export function getCohereService(apiKey: string): CohereService {
  return CohereService.getInstance(apiKey);
}

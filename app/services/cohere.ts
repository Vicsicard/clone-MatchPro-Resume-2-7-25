import { CohereClient } from 'cohere-ai';

// Maximum number of retries for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Type definitions
export interface Suggestion {
  suggestion: string;
  details: string;
  impact: string;
  category: string;
}

export interface CohereAnalysisResult {
  suggestions: Suggestion[];
  similarityScore: number;
}

export class CohereService {
  private client: CohereClient;
  private apiKey: string;
  private static instance: CohereService;

  private constructor(apiKey: string) {
    this.client = new CohereClient({
      token: apiKey
    });
    this.apiKey = apiKey;
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

  public async callCohereAPI(endpoint: string, body: any): Promise<any> {
    try {
      console.log(`Calling Cohere API endpoint: ${endpoint} with body:`, {
        model: body.model,
        messageCount: body.messages?.length,
        temperature: body.temperature,
        maxTokens: body.max_tokens
      });

      const response = await fetch(`https://api.cohere.ai/v2/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Cohere-Version': '2024-02-01'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`Cohere API error (${endpoint}):`, {
          status: response.status,
          statusText: response.statusText,
          error: error,
          endpoint: endpoint
        });
        throw new Error(`Cohere API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Cohere API response (${endpoint}):`, {
        status: response.status,
        hasData: !!data,
        dataKeys: Object.keys(data),
        responseStructure: JSON.stringify(data, null, 2)
      });
      return data;
    } catch (error) {
      console.error('Cohere API call failed:', {
        endpoint: endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error('Cohere API call failed');
    }
  }

  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce((acc, value, index) => acc + value * embedding2[index], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((acc, value) => acc + value ** 2, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((acc, value) => acc + value ** 2, 0));
    return dotProduct / (magnitude1 * magnitude2);
  }

  public async analyzeResume(resumeText: string, jobDescText: string): Promise<CohereAnalysisResult> {
    try {
      console.log('Starting resume analysis with text lengths:', {
        resumeLength: resumeText.length,
        jobDescLength: jobDescText.length
      });

      // Get suggestions using chat
      const chatResponse = await this.retry(() => this.callCohereAPI('chat', {
        model: 'command-r-plus-08-2024',
        messages: [
          {
            role: 'system',
            content: 'You are a professional resume analyzer. Your responses should be in valid JSON format. Always provide at least 3 specific, actionable suggestions.'
          },
          {
            role: 'user',
            content: `Analyze the resume and provide suggestions for improvement based on the job description.

Resume Text:
${resumeText}

Job Description:
${jobDescText}

Please provide AT LEAST 3 specific, actionable suggestions for improving this resume to better match the job description. Focus on:
1. Skills alignment
2. Experience relevance
3. Missing keywords
4. Format and presentation
5. Overall fit

Format your response as a JSON array of suggestions, each with a 'suggestion' title, 'details' explanation, 'impact' (High/Medium/Low), and 'category' (Skills/Experience/Format/Keywords). 

You MUST respond with at least 3 suggestions in the following format:
[
  {
    "suggestion": "Add missing technical skills",
    "details": "Include Python and SQL skills as they are explicitly required in the job description",
    "impact": "High",
    "category": "Skills"
  },
  {
    "suggestion": "Highlight leadership experience",
    "details": "The job description emphasizes team leadership skills. Quantify your management experience with team sizes and achievements.",
    "impact": "Medium",
    "category": "Experience"
  },
  {
    "suggestion": "Add industry-specific keywords",
    "details": "Include key terms like 'agile methodology', 'stakeholder management', and 'product lifecycle' to match the job requirements",
    "impact": "High",
    "category": "Keywords"
  }
]`
          }
        ],
        temperature: 0.7
      }));

      console.log('Got chat response:', {
        responseType: typeof chatResponse,
        hasMessage: 'message' in chatResponse,
        messageType: chatResponse.message ? typeof chatResponse.message : 'undefined',
        textContent: chatResponse.text || chatResponse.message?.content || 'No content found',
        fullResponse: JSON.stringify(chatResponse, null, 2)
      });

      let responseText = '';
      if (chatResponse.text) {
        responseText = chatResponse.text;
      } else if (chatResponse.message?.content?.[0]?.text) {
        responseText = chatResponse.message.content[0].text;
      } else if (typeof chatResponse.message === 'string') {
        responseText = chatResponse.message;
      } else if (Array.isArray(chatResponse.generations) && chatResponse.generations[0]?.text) {
        responseText = chatResponse.generations[0].text;
      } else {
        console.error('Invalid chat response structure:', chatResponse);
        throw new Error('Invalid chat response from Cohere API');
      }

      // Parse suggestions from the response
      let suggestions: Suggestion[];
      try {
        // Find the JSON array in the response text
        const match = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!match) {
          console.error('No JSON array found in response:', responseText);
          // Create default suggestions if none found
          suggestions = [
            {
              suggestion: "Add relevant skills",
              details: "Include more skills mentioned in the job description to improve your match score.",
              impact: "High",
              category: "Skills"
            },
            {
              suggestion: "Highlight relevant experience",
              details: "Focus on experiences that directly relate to the job requirements.",
              impact: "Medium", 
              category: "Experience"
            },
            {
              suggestion: "Include industry keywords",
              details: "Add industry-specific keywords from the job posting to improve your resume's relevance.",
              impact: "High",
              category: "Keywords"
            }
          ];
        } else {
          suggestions = JSON.parse(match[0]);
        }
        
        // Validate suggestions structure
        if (!Array.isArray(suggestions) || !suggestions.every(s => 
          typeof s === 'object' && 
          typeof s.suggestion === 'string' && 
          typeof s.details === 'string' && 
          typeof s.impact === 'string' && 
          typeof s.category === 'string'
        )) {
          console.error('Invalid suggestions structure:', suggestions);
          throw new Error('Invalid suggestions structure in response');
        }
      } catch (error) {
        console.error('Failed to parse suggestions:', error);
        console.log('Raw response:', responseText);
        throw new Error('Failed to parse suggestions from Cohere response');
      }

      // Get embeddings for similarity calculation
      console.log('Getting embeddings...');
      const embedResponse = await this.retry(() => this.callCohereAPI('embed', {
        texts: [resumeText, jobDescText],
        model: 'embed-multilingual-v3.0',
        input_type: 'search_document',
        embedding_types: ['float']
      }));

      console.log('Embed response:', JSON.stringify(embedResponse, null, 2));

      if (!embedResponse?.embeddings?.float || !Array.isArray(embedResponse.embeddings.float) || embedResponse.embeddings.float.length !== 2) {
        console.error('Invalid embedding response:', embedResponse);
        throw new Error('Invalid response from Cohere embed API');
      }

      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(
        embedResponse.embeddings.float[0],
        embedResponse.embeddings.float[1]
      );

      console.log('Analysis complete:', {
        similarityScore: similarity,
        suggestionsCount: suggestions.length,
        fullResponse: embedResponse
      });

      return {
        suggestions,
        similarityScore: similarity
      };
    } catch (error) {
      console.error('Resume analysis failed:', error);
      throw error;
    }
  }
}

// Export a function to get the service instance
export function getCohereService(apiKey: string): CohereService {
  return CohereService.getInstance(apiKey);
}

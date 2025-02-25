declare module 'cohere-ai' {
  export class CohereClient {
    constructor(config: { token: string });
    embed(params: {
      texts: string[];
      model?: string;
      inputType?: string;
    }): Promise<{
      statusCode: number;
      body: {
        id: string;
        texts: string[];
        embeddings: number[][];
      };
    }>;
  }
}

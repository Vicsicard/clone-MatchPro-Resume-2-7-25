import { V2 } from "cohere-ai/dist/api/resources/v2/client/Client";

let client: V2 | null = null;

export function getClient() {
  if (!client) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing COHERE_API_KEY');
    }
    client = new V2({
      token: apiKey
    });
  }
  return client;
}

const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    if (!this.apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
    } else {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  async makeRequest(prompt, options = {}) {
    if (!this.apiKey || !this.client) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ OpenAI API Error:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid API key or access denied.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        throw new Error('API quota exceeded. Please check your billing.');
      }
      
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  // Stream response to client in real-time (optimized for speed)
  async streamResponseToClient(clientSocket, prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1500,
        stream: true
      });

      let fullResponse = '';
      let buffer = ''; // Buffer small chunks for efficiency
      let chunkCount = 0;
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          buffer += content;
          chunkCount++;
          
          // Send immediately for real-time feel (no batching delay)
          // Send every chunk as it arrives for maximum speed
          if (clientSocket.readyState === 1) { // WebSocket.OPEN
            clientSocket.send(JSON.stringify({
              type: 'ai_response_chunk',
              chunk: content,
              isComplete: false,
              timestamp: Date.now()
            }), (error) => {
              // Silently handle send errors (client might have disconnected)
              if (error) {
                console.warn('⚠️ WebSocket send error (client may have disconnected):', error.message);
              }
            });
          }
        }
      }
      
      // Send completion signal immediately
      if (clientSocket.readyState === 1) {
        clientSocket.send(JSON.stringify({
          type: 'ai_response_complete',
          fullResponse: fullResponse,
          isComplete: true,
          progress: 100,
          timestamp: Date.now()
        }), (error) => {
          if (error) {
            console.warn('⚠️ WebSocket completion send error:', error.message);
          }
        });
      }
      
      console.log(`✅ Streamed ${chunkCount} chunks to client`);
      return fullResponse;
    } catch (error) {
      console.error('❌ Streaming Error:', error.message);
      
      // Send error to client
      if (clientSocket.readyState === 1) {
        clientSocket.send(JSON.stringify({
          type: 'ai_response_error',
          error: error.message,
          timestamp: Date.now()
        }));
      }
      
      throw error;
    }
  }

  // Generate single question in real-time from text
  async generateSingleQuestion(text) {
    const prompt = `
    Based on this interview content, generate ONE intelligent and relevant interview question.
    
    Interview content: "${text}"
    
    Rules:
    - Generate a question that digs deeper into the topic discussed
    - Make it specific and relevant to what was just said
    - Focus on technical details, experiences, or challenges mentioned
    - Don't ask generic questions like "Can you elaborate" or "Tell me more"
    - Make it a question that would help understand the candidate's expertise better
    
    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "id": "unique_id",
      "text": "The intelligent interview question",
      "category": "technical|behavioral|general",
      "suggestedAnswer": "A brief suggested answer based on the content",
      "confidence": 0.85
    }
    `;
    
    try {
      const response = await this.makeRequest(prompt, { temperature: 0.7, maxTokens: 300 });
      
      // Clean the response - remove markdown formatting if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const question = JSON.parse(cleanResponse);
      
      return {
        id: question.id || `question_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: question.text,
        category: question.category || 'general',
        suggestedAnswer: question.suggestedAnswer || '',
        confidence: question.confidence || 0.7
      };
    } catch (error) {
      console.error('❌ Error parsing single question response:', error);
      return this.getFallbackSingleQuestion(text);
    }
  }

  async generateQuestions(transcript, maxQuestions = 5, categories = ['technical', 'behavioral', 'general']) {
    const prompt = `
    Analyze this interview transcript and generate ${maxQuestions} relevant interview questions.
    
    Transcript: "${transcript}"
    
    Categories to focus on: ${categories.join(', ')}
    
    Return a JSON array with the following structure for each question:
    {
      "id": "unique_id",
      "text": "The interview question",
      "category": "technical|behavioral|general",
      "suggestedAnswer": "A brief suggested answer based on the transcript",
      "confidence": 0.85
    }
    
    Make sure the response is valid JSON only, no additional text.
    `;
    
    try {
      const response = await this.makeRequest(prompt, { temperature: 0.6 });
      
      // Clean the response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const questions = JSON.parse(cleanResponse);
      
      // Validate response structure
      if (!Array.isArray(questions)) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      return questions.map((q, index) => ({
        id: q.id || `question_${Date.now()}_${index}`,
        text: q.text,
        category: q.category || 'general',
        suggestedAnswer: q.suggestedAnswer || '',
        confidence: q.confidence || 0.7
      }));
    } catch (error) {
      console.error('❌ Error parsing questions response:', error);
      return this.getFallbackQuestions(transcript, maxQuestions);
    }
  }

  async getAnswer(question, context, style = 'professional') {
    const stylePrompts = {
      professional: 'Provide a professional, well-structured answer suitable for a job interview.',
      conversational: 'Provide a conversational, friendly answer that shows personality.',
      detailed: 'Provide a comprehensive, detailed answer with examples and explanations.',
      concise: 'Provide a brief, to-the-point answer.'
    };

    const prompt = `
    Answer this interview question: "${question}"
    
    Context from the interview: "${context}"
    
    Style: ${stylePrompts[style] || stylePrompts.professional}
    
    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "answer": "The comprehensive answer",
      "confidence": 0.92,
      "sources": ["relevant sources or references"],
      "keyPoints": ["key point 1", "key point 2"],
      "estimatedDuration": "2-3 minutes"
    }
    `;
    
    try {
      const response = await this.makeRequest(prompt, { temperature: 0.5, maxTokens: 1500 });
      
      // Clean the response - remove markdown formatting if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const answer = JSON.parse(cleanResponse);
      
      return {
        answer: answer.answer || 'Unable to generate answer',
        confidence: answer.confidence || 0.7,
        sources: answer.sources || [],
        keyPoints: answer.keyPoints || [],
        estimatedDuration: answer.estimatedDuration || '2-3 minutes'
      };
    } catch (error) {
      console.error('❌ Error parsing answer response:', error);
      return this.getFallbackAnswer(question, context);
    }
  }

  // Fallback methods when OpenAI API fails
  getFallbackSingleQuestion(text) {
    const words = text.toLowerCase().split(' ');
    let question = 'What specific examples can you provide from your experience?';
    let category = 'general';
    
    if (words.some(word => ['function', 'code', 'programming', 'react', 'javascript', 'api', 'database', 'circuit'].includes(word))) {
      question = 'Can you walk me through your technical approach to this problem?';
      category = 'technical';
    } else if (words.some(word => ['experience', 'worked', 'project', 'team', 'challenge', 'lead'].includes(word))) {
      question = 'What specific challenges did you face and how did you overcome them?';
      category = 'behavioral';
    }
    
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: question,
      category: category,
      suggestedAnswer: 'Provide specific examples and your approach',
      confidence: 0.6
    };
  }

  getFallbackQuestions(transcript, maxQuestions) {
    const fallbackQuestions = [
      {
        id: 'fallback_1',
        text: 'Tell me about your experience with this topic',
        category: 'general',
        suggestedAnswer: 'Based on the conversation, discuss your relevant experience.',
        confidence: 0.7
      },
      {
        id: 'fallback_2',
        text: 'What challenges have you faced in this area?',
        category: 'behavioral',
        suggestedAnswer: 'Share specific challenges and how you overcame them.',
        confidence: 0.7
      },
      {
        id: 'fallback_3',
        text: 'How would you approach this problem?',
        category: 'technical',
        suggestedAnswer: 'Explain your problem-solving approach step by step.',
        confidence: 0.7
      }
    ];

    return fallbackQuestions.slice(0, maxQuestions);
  }

  getFallbackAnswer(question, context) {
    return {
      answer: `Based on the context provided, here's a suggested answer for: "${question}". Consider discussing your relevant experience, providing specific examples, and connecting your response to the interview context.`,
      confidence: 0.6,
      sources: ['Interview context'],
      keyPoints: ['Relevance to question', 'Specific examples', 'Connection to context'],
      estimatedDuration: '2-3 minutes'
    };
  }
}

module.exports = OpenAIService;


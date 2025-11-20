const WebSocket = require('ws');
require('dotenv').config();
const GeminiService = require('./services/GeminiService');

class AIInterviewSocket {
  constructor() {
    this.CLIENT_PORT = 5000;
    this.API_KEY = process.env.SPEECHMATICS_API_KEY;
    this.LANGUAGE = 'en';
    this.clientServer = null;
    this.activeInterviews = new Map();
    this.geminiService = new GeminiService();
    this.transcriptBuffer = new Map(); // Store transcripts per client
  }

  initialize() {
    console.log('✅ Speechmatics configured:', this.API_KEY ? 'Active' : 'Test Mode');

    this.clientServer = new WebSocket.Server({ port: this.CLIENT_PORT });
    console.log(`🎤 AI Interview WebSocket running on port ${this.CLIENT_PORT}`);

    this.clientServer.on('connection', (clientSocket) => {
      console.log('👤 Frontend client connected to AI Interview');
      
      // Initialize transcript buffer for this client
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.transcriptBuffer.set(clientId, {
        fullTranscript: '',
        currentSegment: '',
        lastQuestionTime: 0,
        questions: [],
        lastTranscriptLength: 0,
        processedSegments: new Set() // Prevent duplicates
      });

      let smSocket = null;

      const connectToSpeechmatics = () => {
        smSocket = new WebSocket('wss://eu2.rt.speechmatics.com/v2', {
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
          },
        });

        smSocket.on('open', () => {
          console.log('✅ Speechmatics connected');

          smSocket.send(JSON.stringify({
            message: "StartRecognition",
            audio_format: {
              type: "raw",
              encoding: "pcm_f32le",
              sample_rate: 16000
            },
            transcription_config: {
              language: this.LANGUAGE,
              enable_partials: true
            }
          }));
        });

        smSocket.on('message', async (data) => {
          try {
            const msg = JSON.parse(data);

            if (msg.message === 'AddTranscript' || msg.message === 'AddPartialTranscript') {
              const transcriptText = msg.metadata?.transcript;
              const segmentId = msg.metadata?.segment_id || `seg_${Date.now()}`;
              
              if (transcriptText && transcriptText.trim().length > 0) {
                const buffer = this.transcriptBuffer.get(clientId);
                if (!buffer) return;

                // Check for duplicates using segment ID
                if (buffer.processedSegments.has(segmentId)) {
                  console.log('🔄 Duplicate segment detected, skipping:', segmentId);
                  return;
                }

                // Mark segment as processed
                buffer.processedSegments.add(segmentId);

                if (msg.message === 'AddPartialTranscript') {
                  // Update current segment for real-time display
                  buffer.currentSegment = transcriptText;
                  
                  // Send accumulated transcript for display
                  const displayTranscript = buffer.fullTranscript + ' ' + buffer.currentSegment;
                  clientSocket.send(JSON.stringify({
                    type: 'transcript_update',
                    transcript: displayTranscript.trim(),
                    isPartial: true,
                    segmentId: segmentId,
                    timestamp: Date.now()
                  }));
                }
                
                if (msg.message === 'AddTranscript') {
                  // Final transcript - add to full transcript
                  if (buffer.currentSegment && buffer.currentSegment !== transcriptText) {
                    // If current segment is different, use the final one
                    buffer.fullTranscript += ' ' + transcriptText;
                  } else {
                    // Add the final transcript
                    buffer.fullTranscript += ' ' + transcriptText;
                  }
                  
                  buffer.fullTranscript = buffer.fullTranscript.trim();
                  buffer.currentSegment = ''; // Clear current segment
                  
                  console.log(`📝 Updated full transcript for client ${clientId}:`, buffer.fullTranscript.length, 'characters');
                  console.log(`📝 Full transcript: "${buffer.fullTranscript}"`);
                  
                  // Send final accumulated transcript to frontend
                  clientSocket.send(JSON.stringify({
                    type: 'transcript_update',
                    transcript: buffer.fullTranscript,
                    isPartial: false,
                    segmentId: segmentId,
                    timestamp: Date.now()
                  }));
                }
              } else {
                console.log('⚠️ Empty transcript received');
              }
            }
          } catch (err) {
            console.error('❌ Error parsing Speechmatics message:', err.message);
          }
        });

        smSocket.on('close', () => {
          // Speechmatics disconnected
          smSocket = null;
        });

        smSocket.on('error', (err) => {
          console.error('❌ Speechmatics error:', err.message);
          smSocket = null;
        });
      };

      // Handle messages from frontend
      clientSocket.on('message', async (msg) => {
        try {
          let messageString = msg;
          if (Buffer.isBuffer(msg)) {
            messageString = msg.toString('utf8');
          }
          
          if (typeof messageString === 'string') {
            
            if (messageString.trim().startsWith('{')) {
              try {
                const controlMsg = JSON.parse(messageString);
                console.log('📝 Parsed control message:', controlMsg);
                
                if (controlMsg.type === 'end_interview') {
                  console.log('🛑 Frontend requested to end interview');
                  
                  if (smSocket && smSocket.readyState === WebSocket.OPEN) {
                    smSocket.send(JSON.stringify({ message: 'StopRecognition' }));
                    smSocket.close();
                    smSocket = null;
                  }
                  
                  this.transcriptBuffer.delete(clientId);
                  
                  clientSocket.send(JSON.stringify({ 
                    type: 'interview_ended',
                    message: 'Interview ended successfully' 
                  }));
                  
                  return;
                }

                if (controlMsg.type === 'get_transcript_answer') {
                  console.log('🤖 Frontend requested answer for transcript');
                  
                  try {
                    await this.getAnswerForTranscript(clientSocket, controlMsg.style || 'professional', clientId);
                    console.log('✅ getAnswerForTranscript completed successfully');
                    
                    // Clear the transcript buffer after sending to AI
                    const buffer = this.transcriptBuffer.get(clientId);
                    if (buffer) {
                      buffer.fullTranscript = '';
                      buffer.currentSegment = '';
                      buffer.processedSegments.clear();
                      console.log('🧹 Transcript buffer cleared after sending to AI');
                    }
                  } catch (error) {
                    console.error('❌ Error in getAnswerForTranscript:', error);
                    if (clientSocket.readyState === WebSocket.OPEN) {
                      clientSocket.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to get transcript answer',
                        error: error.message
                      }));
                    }
                  }
                  return;
                }

                if (controlMsg.type === 'get_answer') {
                  console.log('🤖 Frontend requested answer for question:', controlMsg.questionId);
                  await this.getAnswerForQuestion(clientSocket, controlMsg.questionId, controlMsg.style || 'professional', clientId);
                  return;
                }

                if (controlMsg.type === 'generate_questions') {
                  console.log('🧠 Frontend requested question generation');
                  const buffer = this.transcriptBuffer.get(clientId);
                  if (buffer && buffer.fullTranscript) {
                    await this.generateQuestionsFromTranscript(clientSocket, buffer.fullTranscript, clientId);
                  } else {
                    clientSocket.send(JSON.stringify({
                      type: 'error',
                      message: 'No transcript available for question generation'
                    }));
                  }
                  return;
                }
              } catch (parseError) {
                console.log('❌ Error parsing JSON control message:', parseError.message);
              }
            }
          }
          
          // If it's audio data, send to Speechmatics immediately
          if (smSocket && smSocket.readyState === WebSocket.OPEN) {
            smSocket.send(msg, { binary: true });
          }
        } catch (err) {
          console.log('❌ Error parsing message:', err.message);
          
          // If parsing fails, assume it's audio data
          if (smSocket && smSocket.readyState === WebSocket.OPEN) {
            smSocket.send(msg, { binary: true });
          }
        }
      });

      clientSocket.on('close', (code, reason) => {
        console.log(`❌ Frontend client disconnected: code=${code}, reason=${reason}`);
        
        if (smSocket && smSocket.readyState === WebSocket.OPEN) {
          smSocket.send(JSON.stringify({ message: 'StopRecognition' }));
          smSocket.close();
          smSocket = null;
        }

        this.transcriptBuffer.delete(clientId);
      });

      clientSocket.on('error', (err) => {
        console.error('❌ Client socket error:', err.message);
        
        if (smSocket && smSocket.readyState === WebSocket.OPEN) {
          smSocket.send(JSON.stringify({ message: 'StopRecognition' }));
          smSocket.close();
          smSocket = null;
        }

        this.transcriptBuffer.delete(clientId);
      });

      // Send heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          }));
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Connect to Speechmatics when frontend connects
      if (this.API_KEY) {
        connectToSpeechmatics();
      } else {
        // Test mode (simulated speech-to-text)
        
        const simulateTranscript = async () => {
          const simulatedTranscripts = [
            "I have been working with React for the past three years.",
            "My experience includes building scalable web applications.",
            "I've worked on projects involving Node.js and MongoDB.",
            "I'm passionate about creating user-friendly interfaces.",
            "I've led a team of five developers on multiple projects.",
            "I specialize in frontend development and API integration.",
            "I've implemented authentication systems and payment gateways.",
            "My background includes both startup and enterprise environments."
          ];
          
          const randomTranscript = simulatedTranscripts[Math.floor(Math.random() * simulatedTranscripts.length)];
          
          const buffer = this.transcriptBuffer.get(clientId);
          if (buffer) {
            buffer.fullTranscript += ' ' + randomTranscript;
            buffer.fullTranscript = buffer.fullTranscript.trim();
            
            console.log(`📝 Simulated transcript: "${randomTranscript}"`);
            console.log(`📝 Full transcript: "${buffer.fullTranscript}"`);
            
            // Send accumulated transcript to frontend
            clientSocket.send(JSON.stringify({
              type: 'transcript_update',
              transcript: buffer.fullTranscript,
              isPartial: false,
              segmentId: `sim_${Date.now()}`,
              timestamp: Date.now()
            }));
            
            // Generate question immediately
            console.log('🧠 Generating question from simulated transcript');
            await this.generateSingleQuestionFromText(clientSocket, randomTranscript, clientId);
          }
        };
        
        setTimeout(simulateTranscript, 5000);
        setInterval(simulateTranscript, 10000);
      }
    });
  }

  // Generate single question in real-time from text
  async generateSingleQuestionFromText(clientSocket, text, clientId) {
    try {
      console.log('🧠 Generating real-time question from text:', text);
      
      const question = await this.geminiService.generateSingleQuestion(text);
      
      const buffer = this.transcriptBuffer.get(clientId);
      if (buffer) {
        if (!buffer.questions) buffer.questions = [];
        buffer.questions.push(question);
      }

      clientSocket.send(JSON.stringify({
        type: 'question_generated',
        question: question,
        timestamp: Date.now()
      }));

      console.log(`✅ Generated real-time question: ${question.text}`);
    } catch (error) {
      console.error('❌ Error generating real-time question:', error);
      
      clientSocket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to generate real-time question',
        error: error.message
      }));
    }
  }

  // Generate questions from transcript and send to frontend
  async generateQuestionsFromTranscript(clientSocket, transcript, clientId) {
    try {
      console.log('🧠 Generating questions from transcript...');
      console.log('📝 Transcript length:', transcript.length);
      console.log('📝 Transcript preview:', transcript.substring(0, 200) + '...');
      
      const questions = await this.geminiService.generateQuestions(transcript, 5);
      
      const buffer = this.transcriptBuffer.get(clientId);
      if (buffer) {
        buffer.questions = questions;
      }

      clientSocket.send(JSON.stringify({
        type: 'questions_generated',
        questions: questions,
        timestamp: Date.now()
      }));

      console.log(`✅ Generated ${questions.length} questions from transcript for client ${clientId}`);
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      
      clientSocket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to generate questions from transcript',
        error: error.message
      }));
    }
  }

  // Get answer for transcript and send to frontend with streaming
  async getAnswerForTranscript(clientSocket, style, clientId) {
    try {
      console.log('🤖 Getting streaming answer for transcript');
      console.log('🔍 Client socket state before processing:', clientSocket.readyState);
      
      const buffer = this.transcriptBuffer.get(clientId);
      if (!buffer) {
        throw new Error('Client session not found');
      }

      if (!buffer.fullTranscript || buffer.fullTranscript.trim().length === 0) {
        throw new Error('No transcript available');
      }

      console.log('📝 Sending transcript to Gemini for streaming response:', buffer.fullTranscript);
      console.log('🔍 Gemini service available:', !!this.geminiService);

      const stylePrompts = {
        professional: 'Provide a professional, well-structured response suitable for a job interview.',
        conversational: 'Provide a conversational, friendly response that shows personality.',
        detailed: 'Provide a comprehensive, detailed response with examples and explanations.',
        concise: 'Provide a brief, to-the-point response.'
      };

      const prompt = `
      Based on this interview transcript, provide a helpful response or answer.
      
      Transcript: "${buffer.fullTranscript}"
      
      Style: ${stylePrompts[style] || stylePrompts.professional}
      
      Provide a natural, conversational response that addresses the content of the transcript.
      `;

      await this.geminiService.streamResponseToClient(clientSocket, prompt, { 
        temperature: 0.5, 
        maxTokens: 1500 
      });
      
      console.log('✅ Streaming response completed');
    } catch (error) {
      console.error('❌ Error getting streaming transcript answer:', error);
      
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to get transcript answer',
          error: error.message
        }));
      } else {
        console.error('❌ Cannot send error to frontend - socket is closed');
      }
    }
  }

  // Get answer for specific question and send to frontend
  async getAnswerForQuestion(clientSocket, questionId, style, clientId) {
    try {
      console.log('🤖 Getting answer for question:', questionId);
      
      const buffer = this.transcriptBuffer.get(clientId);
      if (!buffer) {
        throw new Error('Client session not found');
      }

      const question = buffer.questions.find(q => q.id === questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      const answer = await this.geminiService.getAnswer(question.text, buffer.fullTranscript, style);
      
      clientSocket.send(JSON.stringify({
        type: 'answer_received',
        questionId: questionId,
        question: question.text,
        answer: answer,
        timestamp: Date.now()
      }));

      console.log(`✅ Generated answer for question ${questionId}`);
    } catch (error) {
      console.error('❌ Error getting answer:', error);
      
      clientSocket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to get answer',
        error: error.message,
        questionId: questionId
      }));
    }
  }

  getActiveInterviews() {
    return Array.from(this.activeInterviews.values());
  }

  addInterview(interviewData) {
    const interviewId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeInterviews.set(interviewId, {
      id: interviewId,
      ...interviewData,
      createdAt: new Date()
    });
    return interviewId;
  }

  close() {
    if (this.clientServer) {
      this.clientServer.close();
      console.log('🔌 AI Interview WebSocket server closed');
    }
  }
}

module.exports = AIInterviewSocket;

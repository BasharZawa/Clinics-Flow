/**
 * OpenAI Service
 * Integration with OpenAI API for AI-powered features
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  /**
   * Generate AI response for chatbot or assistant
   */
  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      const messages: any[] = [
        {
          role: 'system',
          content: context || 'You are a helpful assistant for a clinic management system. Be concise and professional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Generate appointment confirmation message
   */
  async generateAppointmentConfirmation(
    patientName: string,
    service: string,
    date: string,
    time: string
  ): Promise<string> {
    const prompt = `Generate a friendly Arabic appointment confirmation message for:
    - Patient: ${patientName}
    - Service: ${service}
    - Date: ${date}
    - Time: ${time}
    
    Keep it concise, professional, and warm. Include a reminder to reply to confirm.`;

    return this.generateResponse(prompt, 'You are a clinic appointment assistant. Generate messages in Arabic.');
  }

  /**
   * Analyze patient sentiment from feedback
   */
  async analyzeSentiment(feedback: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    summary: string;
  }> {
    try {
      const prompt = `Analyze the sentiment of this patient feedback and provide a JSON response with:
        - sentiment: "positive", "neutral", or "negative"
        - score: number between -1 (very negative) and 1 (very positive)
        - summary: brief 1-sentence summary in Arabic
        
        Feedback: "${feedback}"
        
        Response format: {"sentiment": "...", "score": 0.5, "summary": "..."}`;

      const response = await this.generateResponse(prompt, 'You are a sentiment analysis assistant. Always respond with valid JSON.');
      
      // Parse the JSON response
      const result = JSON.parse(response);
      return result;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        summary: 'Could not analyze feedback',
      };
    }
  }

  /**
   * Generate clinic performance insights
   */
  async generateInsights(metrics: {
    totalAppointments: number;
    noShowRate: number;
    revenue: number;
    newPatients: number;
  }): Promise<string> {
    const prompt = `Based on these clinic metrics, provide 3 actionable insights in Arabic:
    - Total appointments this month: ${metrics.totalAppointments}
    - No-show rate: ${metrics.noShowRate}%
    - Revenue: $${metrics.revenue}
    - New patients: ${metrics.newPatients}
    
    Keep insights concise and actionable.`;

    return this.generateResponse(prompt, 'You are a clinic business consultant. Provide insights in Arabic.');
  }

  /**
   * Generate WhatsApp message templates
   */
  async generateMessageTemplate(
    type: 'reminder' | 'confirmation' | 'followup',
    language: 'ar' | 'en' = 'ar'
  ): Promise<string> {
    const prompts: Record<string, string> = {
      reminder: `Generate a friendly ${language === 'ar' ? 'Arabic' : 'English'} WhatsApp reminder message for an upcoming appointment. Include placeholders for [PatientName], [Date], [Time], and [Service].`,
      confirmation: `Generate a warm ${language === 'ar' ? 'Arabic' : 'English'} appointment confirmation message. Include placeholders for [PatientName], [Date], [Time], and instructions to confirm.`,
      followup: `Generate a caring ${language === 'ar' ? 'Arabic' : 'English'} follow-up message after an appointment. Ask about their experience and invite them to book again.`,
    };

    return this.generateResponse(
      prompts[type],
      'You are a customer service expert for healthcare. Generate professional yet warm messages.'
    );
  }

  /**
   * Translate text between languages
   */
  async translate(text: string, targetLanguage: 'ar' | 'en'): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage === 'ar' ? 'Arabic' : 'English'}:
    "${text}"
    
    Provide only the translation, no additional text.`;

    return this.generateResponse(prompt, 'You are a professional translator.');
  }
}

export const openAIService = new OpenAIService();

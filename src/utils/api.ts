/**
 * JARVIS Multi-API Routing System
 * Dynamic routing to multiple LLM cloud providers
 * PRODUCTION READY - Proper error handling and response parsing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== TYPES ====================

export type AIModel = 
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'kimi-2.5'
  | 'glm-4-plus'
  | 'glm-4-flash'
  | 'grok-2'
  | 'grok-2-vision'
  | 'claude-sonnet-4'
  | 'claude-opus-4'
  | 'deepseek-chat'
  | 'deepseek-reasoner';

export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: string;
  apiKeyName: string;
  baseUrl: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
  size: string;
  description: string;
}

export interface APIKey {
  gemini: string;
  kimi: string;
  glm: string;
  grok: string;
  claude: string;
  deepseek: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ==================== MODEL CONFIGURATIONS ====================

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    apiKeyName: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    maxTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Fast and efficient multimodal AI',
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    apiKeyName: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    maxTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Most capable Gemini model',
  },
  'kimi-2.5': {
    id: 'kimi-2.5',
    name: 'Kimi 2.5',
    provider: 'Moonshot',
    apiKeyName: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    maxTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
    size: '8B',
    description: 'Chinese AI with long context',
  },
  'glm-4-plus': {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    provider: 'Zhipu AI',
    apiKeyName: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    maxTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Powerful Chinese multimodal AI',
  },
  'glm-4-flash': {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    provider: 'Zhipu AI',
    apiKeyName: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    maxTokens: 4096,
    supportsVision: false,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Fast GLM variant',
  },
  'grok-2': {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'X.AI',
    apiKeyName: 'grok',
    baseUrl: 'https://api.x.ai/v1',
    maxTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
    size: 'N/A',
    description: 'X.AI witty assistant',
  },
  'grok-2-vision': {
    id: 'grok-2-vision',
    name: 'Grok 2 Vision',
    provider: 'X.AI',
    apiKeyName: 'grok',
    baseUrl: 'https://api.x.ai/v1',
    maxTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Grok with image support',
  },
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    apiKeyName: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    maxTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Fast and capable Claude',
  },
  'claude-opus-4': {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    apiKeyName: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    maxTokens: 16384,
    supportsVision: true,
    supportsStreaming: true,
    size: 'N/A',
    description: 'Most powerful Claude model',
  },
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    apiKeyName: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    maxTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
    size: '67B',
    description: 'Excellent coding assistant',
  },
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'DeepSeek',
    apiKeyName: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    maxTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
    size: '671B',
    description: 'Deep reasoning model',
  },
};

export const MODEL_CATEGORIES = {
  'Google Gemini': ['gemini-2.5-flash', 'gemini-2.5-pro'],
  'Moonshot Kimi': ['kimi-2.5'],
  'Zhipu GLM': ['glm-4-plus', 'glm-4-flash'],
  'X.AI Grok': ['grok-2', 'grok-2-vision'],
  'Anthropic Claude': ['claude-sonnet-4', 'claude-opus-4'],
  'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
};

// ==================== API KEY STORAGE ====================

const API_KEYS_STORAGE_KEY = 'jarvis_api_keys';

export const APIKeyManager = {
  async getKeys(): Promise<APIKey> {
    try {
      const stored = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
    return {
      gemini: '',
      kimi: '',
      glm: '',
      grok: '',
      claude: '',
      deepseek: '',
    };
  },

  async saveKeys(keys: APIKey): Promise<void> {
    try {
      await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  },

  async getKeyForModel(model: AIModel): Promise<string> {
    const keys = await this.getKeys();
    const config = MODEL_CONFIGS[model];
    return keys[config.apiKeyName] || '';
  },

  async hasKeyForModel(model: AIModel): Promise<boolean> {
    const key = await this.getKeyForModel(model);
    return key.length > 0;
  },
};

// ==================== ERROR HANDLING ====================

class APIError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'APIError';
  }

  toUserMessage(): string {
    if (this.message.startsWith('NO_API_KEY:')) {
      const modelId = this.message.split(':')[1];
      const config = MODEL_CONFIGS[modelId as AIModel];
      return `⚠️ Please add your ${config?.name || modelId} API key in Settings to use this model.`;
    }

    if (this.statusCode === 401 || this.statusCode === 403) {
      return `❌ Invalid API key for ${this.provider}. Please check your key in Settings.`;
    }

    if (this.statusCode === 429) {
      return `⏳ Rate limit exceeded for ${this.provider}. Please wait and try again.`;
    }

    if (this.statusCode && this.statusCode >= 500) {
      return `🔧 ${this.provider} servers are experiencing issues. Please try again later.`;
    }

    if (this.message.includes('network') || this.message.includes('fetch')) {
      return `📡 Network error. Please check your internet connection.`;
    }

    return `❌ ${this.provider} API Error: ${this.details || this.message}`;
  }
}

// ==================== API CLIENT ====================

class MultiAPIClient {
  private abortController: AbortController | null = null;

  /**
   * Chat completion with automatic provider routing
   */
  async chat(
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const apiKey = await APIKeyManager.getKeyForModel(model);
    
    if (!apiKey) {
      throw new APIError(`NO_API_KEY:${model}`, MODEL_CONFIGS[model].provider);
    }

    const config = MODEL_CONFIGS[model];

    try {
      switch (config.apiKeyName) {
        case 'gemini':
          return await this.geminiChat(model, apiKey, messages, systemPrompt);
        case 'kimi':
          return await this.openaiCompatibleChat(config.baseUrl, apiKey, model, messages, systemPrompt);
        case 'glm':
          return await this.glmChat(config.baseUrl, apiKey, model, messages, systemPrompt);
        case 'grok':
          return await this.openaiCompatibleChat(config.baseUrl, apiKey, model, messages, systemPrompt);
        case 'claude':
          return await this.claudeChat(config.baseUrl, apiKey, model, messages, systemPrompt);
        case 'deepseek':
          return await this.openaiCompatibleChat(config.baseUrl, apiKey, model, messages, systemPrompt);
        default:
          throw new APIError(`Unknown provider: ${config.apiKeyName}`, config.provider);
      }
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        config.provider
      );
    }
  }

  /**
   * Streaming chat completion
   */
  async *streamChat(
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const apiKey = await APIKeyManager.getKeyForModel(model);
    
    if (!apiKey) {
      throw new APIError(`NO_API_KEY:${model}`, MODEL_CONFIGS[model].provider);
    }

    const config = MODEL_CONFIGS[model];

    try {
      switch (config.apiKeyName) {
        case 'gemini':
          yield* this.geminiStreamChat(model, apiKey, messages, systemPrompt);
          break;
        case 'claude':
          yield* this.claudeStreamChat(config.baseUrl, apiKey, model, messages, systemPrompt);
          break;
        default:
          yield* this.openaiCompatibleStreamChat(config.baseUrl, apiKey, model, messages, systemPrompt);
      }
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        config.provider
      );
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  // ==================== GEMINI API ====================

  private async geminiChat(
    model: AIModel,
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    this.abortController = new AbortController();
    
    // Use correct model IDs
    const modelId = model === 'gemini-2.5-pro' 
      ? 'gemini-2.5-pro-preview-06-05' 
      : 'gemini-2.0-flash';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body: any = { contents };
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    console.log(`[Gemini] Sending request to ${modelId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    const data = await response.json();
    console.log('[Gemini] Response status:', response.status);

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data.error) || 'Unknown error';
      throw new APIError(errorMsg, 'Google', response.status, errorMsg);
    }

    // PROPER RESPONSE PARSING
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text || text.trim() === '') {
      console.error('[Gemini] Empty or invalid response:', JSON.stringify(data, null, 2));
      
      // Check for blocked content
      if (data?.promptFeedback?.blockReason) {
        throw new APIError(
          'Content blocked by safety filters',
          'Google',
          response.status,
          `Block reason: ${data.promptFeedback.blockReason}`
        );
      }
      
      throw new APIError('Empty response from API', 'Google', response.status);
    }

    return text;
  }

  private async *geminiStreamChat(
    model: AIModel,
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    this.abortController = new AbortController();
    
    const modelId = model === 'gemini-2.5-pro' 
      ? 'gemini-2.5-pro-preview-06-05' 
      : 'gemini-2.0-flash';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body: any = { contents };
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new APIError('Stream request failed', 'Google', response.status, error);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new APIError('No response body', 'Google');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const json = JSON.parse(jsonStr);
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch (e) {
          console.warn('[Gemini Stream] Parse error:', e);
        }
      }
    }
  }

  // ==================== CLAUDE API ====================

  private async claudeChat(
    baseUrl: string,
    apiKey: string,
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    this.abortController = new AbortController();

    const claudeModel = model === 'claude-opus-4' 
      ? 'claude-opus-4-20250514' 
      : 'claude-sonnet-4-20250514';
    
    const body: any = {
      model: claudeModel,
      max_tokens: 4096,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    console.log(`[Claude] Sending request to ${claudeModel}`);

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    const data = await response.json();
    console.log('[Claude] Response status:', response.status);

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data.error) || 'Unknown error';
      throw new APIError(errorMsg, 'Anthropic', response.status, errorMsg);
    }

    // PROPER RESPONSE PARSING for Claude
    const text = data?.content?.[0]?.text;
    
    if (!text || text.trim() === '') {
      console.error('[Claude] Empty response:', JSON.stringify(data, null, 2));
      throw new APIError('Empty response from API', 'Anthropic', response.status);
    }

    return text;
  }

  private async *claudeStreamChat(
    baseUrl: string,
    apiKey: string,
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    this.abortController = new AbortController();

    const claudeModel = model === 'claude-opus-4' 
      ? 'claude-opus-4-20250514' 
      : 'claude-sonnet-4-20250514';
    
    const body: any = {
      model: claudeModel,
      max_tokens: 4096,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new APIError('Stream request failed', 'Anthropic', response.status, error);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new APIError('No response body', 'Anthropic');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const json = JSON.parse(jsonStr);
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield json.delta.text;
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  // ==================== GLM API ====================

  private async glmChat(
    baseUrl: string,
    apiKey: string,
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    this.abortController = new AbortController();

    const glmModel = model === 'glm-4-flash' ? 'glm-4-flash' : 'glm-4-plus';
    
    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    console.log(`[GLM] Sending request to ${glmModel}`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: glmModel,
        messages: allMessages,
      }),
      signal: this.abortController.signal,
    });

    const data = await response.json();
    console.log('[GLM] Response status:', response.status);

    if (!response.ok) {
      const errorMsg = data.error?.message || data.message || JSON.stringify(data);
      throw new APIError(errorMsg, 'Zhipu AI', response.status, errorMsg);
    }

    // PROPER RESPONSE PARSING for OpenAI-compatible format
    const text = data?.choices?.[0]?.message?.content;
    
    if (!text || text.trim() === '') {
      console.error('[GLM] Empty response:', JSON.stringify(data, null, 2));
      throw new APIError('Empty response from API', 'Zhipu AI', response.status);
    }

    return text;
  }

  // ==================== OPENAI-COMPATIBLE API ====================

  private async openaiCompatibleChat(
    baseUrl: string,
    apiKey: string,
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<string> {
    this.abortController = new AbortController();

    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    // Model ID mapping
    let modelId = model;
    if (model === 'kimi-2.5') modelId = 'moonshot-v1-8k';
    if (model === 'grok-2') modelId = 'grok-2-latest';
    if (model === 'grok-2-vision') modelId = 'grok-2-vision-latest';

    const provider = MODEL_CONFIGS[model].provider;
    console.log(`[${provider}] Sending request to ${modelId}`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: allMessages,
      }),
      signal: this.abortController.signal,
    });

    const data = await response.json();
    console.log(`[${provider}] Response status:`, response.status);

    if (!response.ok) {
      const errorMsg = data.error?.message || data.message || JSON.stringify(data);
      throw new APIError(errorMsg, provider, response.status, errorMsg);
    }

    // PROPER RESPONSE PARSING
    const text = data?.choices?.[0]?.message?.content;
    
    if (!text || text.trim() === '') {
      console.error(`[${provider}] Empty response:`, JSON.stringify(data, null, 2));
      throw new APIError('Empty response from API', provider, response.status);
    }

    return text;
  }

  private async *openaiCompatibleStreamChat(
    baseUrl: string,
    apiKey: string,
    model: AIModel,
    messages: ChatMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    this.abortController = new AbortController();

    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    let modelId = model;
    if (model === 'kimi-2.5') modelId = 'moonshot-v1-8k';
    if (model === 'grok-2') modelId = 'grok-2-latest';
    if (model === 'grok-2-vision') modelId = 'grok-2-vision-latest';

    const provider = MODEL_CONFIGS[model].provider;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: allMessages,
        stream: true,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new APIError('Stream request failed', provider, response.status, error);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new APIError('No response body', provider);
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const json = JSON.parse(jsonStr);
          const text = json?.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

// ==================== EXPORTS ====================

export const apiClient = new MultiAPIClient();
export { APIError, MultiAPIClient };

/**
 * JARVIS Chat Screen
 * Cloud AI Multi-Model Chat Interface
 * PRODUCTION READY - Proper error handling
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { 
  useChatStore, 
  useVoiceStore, 
  useSystemStore,
  useAPIKeysStore,
  useUIStore,
  Message 
} from '../stores';
import { 
  COLORS, 
  SPACING, 
  BORDER_RADIUS, 
} from '../constants/theme';
import { TypingDots } from '../components/Animations';
import { 
  apiClient,
  APIError,
  AIModel,
  MODEL_CONFIGS,
  MODEL_CATEGORIES,
} from '../utils/api';

// Message Bubble Component
const MessageBubble: React.FC<{ msg: Message; isUser: boolean }> = ({ msg, isUser }) => {
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.msgContainer, isUser && styles.msgUser]}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {!isUser && (
          <View style={styles.aiHeader}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>J</Text>
            </View>
            <View>
              <Text style={styles.aiName}>JARVIS</Text>
              {msg.model && (
                <Text style={styles.aiModel}>{MODEL_CONFIGS[msg.model]?.name || msg.model}</Text>
              )}
            </View>
          </View>
        )}
        <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{msg.content}</Text>
        <Text style={[styles.time, isUser && styles.timeUser]}>{time}</Text>
      </View>
    </Animated.View>
  );
};

// Model Selector Modal
const ModelSelectorModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  currentModel: AIModel;
  onSelect: (model: AIModel) => void;
}> = ({ visible, onClose, currentModel, onSelect }) => {
  const { hasKey } = useAPIKeysStore();

  const handleSelect = async (model: AIModel) => {
    const config = MODEL_CONFIGS[model];
    const providerKey = config.apiKeyName as 'gemini' | 'kimi' | 'glm' | 'grok' | 'claude' | 'deepseek';
    
    if (!hasKey(providerKey)) {
      Alert.alert(
        'API Key Required',
        `Please add the API key for ${config.name} in Settings.\n\nGo to Settings → API Keys section.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: onClose }
        ]
      );
      return;
    }
    
    onSelect(model);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🤖 Select AI Model</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modelList}>
            {Object.entries(MODEL_CATEGORIES).map(([category, models]) => (
              <View key={category} style={styles.modelCategory}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {(models as AIModel[]).map((model) => {
                  const info = MODEL_CONFIGS[model];
                  const providerKey = info.apiKeyName as 'gemini' | 'kimi' | 'glm' | 'grok' | 'claude' | 'deepseek';
                  const hasApiKey = hasKey(providerKey);
                  const isSelected = currentModel === model;

                  return (
                    <TouchableOpacity
                      key={model}
                      style={[
                        styles.modelItem,
                        isSelected && styles.modelItemSelected,
                        !hasApiKey && styles.modelItemNoKey,
                      ]}
                      onPress={() => handleSelect(model)}
                    >
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{info?.name || model}</Text>
                        <Text style={styles.modelDesc}>{info?.description}</Text>
                        <View style={styles.modelMeta}>
                          <Text style={styles.modelSize}>Size: {info?.size}</Text>
                          <Text style={styles.modelProvider}>{info?.provider}</Text>
                        </View>
                      </View>
                      <View style={styles.modelStatus}>
                        {isSelected && <Text style={styles.selectedBadge}>✓</Text>}
                        {!hasApiKey && (
                          <Text style={styles.noKeyBadge}>⚠️ Key needed</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              💡 Add API keys in Settings to unlock models
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Empty State
const EmptyState: React.FC<{ onSelect: (t: string) => void }> = ({ onSelect }) => {
  const suggestions = ["What can you do?", "Tell me about yourself", "Help me with coding"];

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>J</Text>
      </View>
      <Text style={styles.emptyTitle}>JARVIS</Text>
      <Text style={styles.emptySub}>Your Multi-Model AI Assistant</Text>
      <Text style={styles.emptyHint}>Powered by Cloud AI</Text>
      <View style={styles.suggestions}>
        {suggestions.map((s, i) => (
          <TouchableOpacity key={i} style={styles.chip} onPress={() => onSelect(s)}>
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Main Chat Screen
export const ChatScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isStream, setIsStream] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const { 
    conversations, 
    activeId, 
    isTyping, 
    currentModel,
    create, 
    addMessage, 
    setTyping, 
    getActive,
    setCurrentModel,
  } = useChatStore();
  
  const { listening, setState: setVoiceState, setListening } = useVoiceStore();
  const { status, setStatus, setReady } = useSystemStore();
  const { showModelSelector, setShowModelSelector } = useUIStore();
  const { hasKey } = useAPIKeysStore();

  const active = getActive();
  const messages = active?.messages || [];

  // Initialize
  useEffect(() => {
    setStatus('ready');
    setReady(true);
  }, []);

  // Send message
  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    let convId = activeId;
    if (!convId) convId = create();

    addMessage(convId, { role: 'user', content: text.trim() });
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setStatus('busy');
      setTyping(true);

      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
      const history = (conv?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Check if API key exists
      const config = MODEL_CONFIGS[currentModel];
      const providerKey = config.apiKeyName as 'gemini' | 'kimi' | 'glm' | 'grok' | 'claude' | 'deepseek';
      
      if (!hasKey(providerKey)) {
        const errorMsg = `⚠️ Please add your ${config.name} API key in Settings to use this model.`;
        addMessage(convId, { role: 'assistant', content: errorMsg, model: currentModel });
        setTyping(false);
        setStatus('ready');
        return;
      }

      // Stream response
      setIsStream(true);
      setStreaming('');

      let fullResponse = '';
      
      const systemPrompt = `You are JARVIS, an advanced AI assistant. You are helpful, intelligent, and professional. Keep responses concise but informative. You're currently running on ${config.name}.`;

      try {
        for await (const chunk of apiClient.streamChat(currentModel, history, systemPrompt)) {
          fullResponse += chunk;
          setStreaming(fullResponse);
        }
      } catch (error: any) {
        // Handle API errors properly
        let errorMessage = 'An error occurred while processing your request.';
        
        if (error instanceof APIError) {
          errorMessage = error.toUserMessage();
        } else if (error.message?.startsWith('NO_API_KEY:')) {
          errorMessage = `⚠️ Please add your ${config.name} API key in Settings.`;
        } else if (error.message) {
          errorMessage = `❌ ${error.message}`;
        }

        // If we got partial response, show it
        if (fullResponse.trim()) {
          fullResponse += '\n\n' + errorMessage;
        } else {
          fullResponse = errorMessage;
        }
      }

      setIsStream(false);
      setStreaming('');

      addMessage(convId, { role: 'assistant', content: fullResponse, model: currentModel });
      setTyping(false);
      setStatus('ready');

    } catch (e: any) {
      const errorMsg = e instanceof APIError 
        ? e.toUserMessage() 
        : `❌ Error: ${e.message || 'Unknown error'}`;
      
      addMessage(convId, { role: 'assistant', content: errorMsg });
      setTyping(false);
      setStatus('ready');
      setError(errorMsg);
    }
  }, [activeId, currentModel, hasKey]);

  // Voice input
  const handleVoice = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Voice Input', 'Voice input requires native module. Build with EAS to enable.');
  }, []);

  // Render message
  const renderMsg = ({ item }: { item: Message }) => (
    <MessageBubble msg={item} isUser={item.role === 'user'} />
  );

  // Render footer
  const renderFooter = () => {
    if (isStream && streaming) {
      return (
        <View style={styles.streaming}>
          <Text style={styles.streamingText}>{streaming}</Text>
          <Text style={styles.cursor}>▊</Text>
        </View>
      );
    }
    if (isTyping && !streaming) {
      return (
        <View style={styles.typing}>
          <TypingDots />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={styles.header}
      >
        <Text style={styles.title}>JARVIS</Text>
        
        {/* Model Selector Button */}
        <TouchableOpacity 
          style={styles.modelButton} 
          onPress={() => setShowModelSelector(true)}
        >
          <Text style={styles.modelButtonText}>
            {MODEL_CONFIGS[currentModel]?.name || currentModel}
          </Text>
          <Text style={styles.modelButtonArrow}>▼</Text>
        </TouchableOpacity>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: status === 'ready' ? COLORS.status.online : COLORS.status.busy }
          ]} />
          <Text style={styles.statusText}>
            {status === 'ready' ? 'Ready' : 'Processing...'}
          </Text>
        </View>
      </LinearGradient>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Chat */}
      <KeyboardAvoidingView
        style={styles.chat}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMsg}
          ListEmptyComponent={() => <EmptyState onSelect={send} />}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message JARVIS..."
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            onSubmitEditing={() => send(input)}
          />

          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={handleVoice}
          >
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>

          {input.length > 0 && (
            <TouchableOpacity style={styles.sendBtn} onPress={() => send(input)}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Model Selector Modal */}
      <ModelSelectorModal
        visible={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        currentModel={currentModel}
        onSelect={(model) => setCurrentModel(model)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.neon.blue,
    letterSpacing: 4,
  },
  modelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.neon.blue,
  },
  modelButtonText: {
    fontSize: 12,
    color: COLORS.neon.blue,
  },
  modelButtonArrow: {
    fontSize: 8,
    color: COLORS.neon.blue,
    marginLeft: SPACING.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
  statusText: { fontSize: 12, color: COLORS.text.secondary },
  errorBanner: {
    backgroundColor: COLORS.status.error + '20',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.status.error + '40',
  },
  errorText: {
    color: COLORS.status.error,
    fontSize: 12,
    textAlign: 'center',
  },
  chat: { flex: 1 },
  list: { padding: SPACING.md, flexGrow: 1 },
  msgContainer: { marginVertical: SPACING.xs, marginHorizontal: SPACING.sm, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  bubble: { padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  bubbleUser: { backgroundColor: COLORS.neon.blue, borderBottomRightRadius: BORDER_RADIUS.sm },
  bubbleAI: {
    backgroundColor: COLORS.background.card,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.neon.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  aiAvatarText: { fontSize: 12, fontWeight: 'bold', color: COLORS.background.primary },
  aiName: { fontSize: 12, fontWeight: '600', color: COLORS.neon.blue },
  aiModel: { fontSize: 10, color: COLORS.text.tertiary },
  msgText: { fontSize: 14, color: COLORS.text.primary, lineHeight: 20 },
  msgTextUser: { color: COLORS.background.primary },
  time: { fontSize: 10, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'right' },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
  streaming: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.background.card,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.sm,
  },
  streamingText: { flex: 1, color: COLORS.text.primary },
  cursor: { color: COLORS.neon.blue },
  typing: { padding: SPACING.md, alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.neon.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIconText: { fontSize: 36, fontWeight: 'bold', color: COLORS.background.primary },
  emptyTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text.primary },
  emptySub: { fontSize: 14, color: COLORS.text.secondary, marginTop: SPACING.sm },
  emptyHint: { fontSize: 12, color: COLORS.neon.cyan, marginTop: SPACING.xs },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm, marginTop: SPACING.xl },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.background.elevated,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  chipText: { color: COLORS.text.secondary, fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background.input,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    padding: SPACING.sm,
    margin: SPACING.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    maxHeight: 100,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  voiceIcon: { fontSize: 16 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neon.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  sendIcon: { fontSize: 18, fontWeight: 'bold', color: COLORS.background.primary },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
  modalClose: { fontSize: 18, color: COLORS.text.secondary },
  modelList: { padding: SPACING.md },
  modelCategory: { marginBottom: SPACING.lg },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neon.cyan,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  modelItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.neon.blue,
    backgroundColor: COLORS.neon.blue + '20',
  },
  modelItemNoKey: {
    opacity: 0.7,
  },
  modelInfo: { flex: 1 },
  modelName: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  modelDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  modelMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  modelSize: { fontSize: 10, color: COLORS.text.tertiary },
  modelProvider: { fontSize: 10, color: COLORS.neon.purple },
  modelStatus: { alignItems: 'flex-end' },
  selectedBadge: {
    fontSize: 16,
    color: COLORS.neon.blue,
    fontWeight: 'bold',
  },
  noKeyBadge: {
    fontSize: 10,
    color: COLORS.status.busy,
    marginTop: 4,
  },
  modalFooter: {
    padding: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  footerText: { fontSize: 12, color: COLORS.text.tertiary },
});

export default ChatScreen;

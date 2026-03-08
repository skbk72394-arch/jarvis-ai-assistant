/**
 * JARVIS Stores
 * Zustand state management with Cloud AI model support
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIModel } from '../utils/api';

// Types
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: AIModel;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export type SystemStatus = 'initializing' | 'ready' | 'busy' | 'error';

// Generate ID
const genId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ==================== CHAT STORE ====================

interface ChatStore {
  conversations: Conversation[];
  activeId: string | null;
  isTyping: boolean;
  currentModel: AIModel;
  create: (title?: string) => string;
  setActive: (id: string | null) => void;
  addMessage: (convId: string, msg: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (v: boolean) => void;
  getActive: () => Conversation | null;
  setCurrentModel: (model: AIModel) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      isTyping: false,
      currentModel: 'gemini-2.5-flash' as AIModel,

      create: (title?: string) => {
        const id = genId();
        const now = Date.now();
        const conv: Conversation = {
          id,
          title: title || `Chat ${get().conversations.length + 1}`,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ conversations: [conv, ...s.conversations], activeId: id }));
        return id;
      },

      setActive: (id) => set({ activeId: id }),

      addMessage: (convId, msg) => {
        const message: Message = { 
          ...msg, 
          id: genId(), 
          timestamp: Date.now(),
          model: get().currentModel,
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
              : c
          ),
        }));
      },

      setTyping: (v) => set({ isTyping: v }),

      getActive: () => get().conversations.find((c) => c.id === get().activeId) || null,

      setCurrentModel: (model) => set({ currentModel: model }),

      clearAll: () => set({ conversations: [], activeId: null }),
    }),
    { name: 'jarvis-chat', storage: createJSONStorage(() => AsyncStorage) }
  )
);

// ==================== VOICE STORE ====================

interface VoiceStore {
  state: VoiceState;
  listening: boolean;
  setState: (s: VoiceState) => void;
  setListening: (v: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>()((set) => ({
  state: 'idle',
  listening: false,
  setState: (s) => set({ state: s }),
  setListening: (v) => set({ listening: v }),
}));

// ==================== SYSTEM STORE ====================

interface SystemStore {
  status: SystemStatus;
  ready: boolean;
  setStatus: (s: SystemStatus) => void;
  setReady: (v: boolean) => void;
}

export const useSystemStore = create<SystemStore>()((set) => ({
  status: 'initializing',
  ready: false,
  setStatus: (s) => set({ status: s }),
  setReady: (v) => set({ ready: v }),
}));

// ==================== API KEYS STORE ====================

import { APIKey } from '../utils/api';

interface APIKeysStore {
  keys: APIKey;
  setKeys: (keys: APIKey) => void;
  updateKey: (provider: keyof APIKey, key: string) => void;
  hasKey: (provider: keyof APIKey) => boolean;
}

export const useAPIKeysStore = create<APIKeysStore>()(
  persist(
    (set, get) => ({
      keys: {
        gemini: '',
        kimi: '',
        glm: '',
        grok: '',
        claude: '',
        deepseek: '',
      },

      setKeys: (keys) => set({ keys }),

      updateKey: (provider, key) => {
        set((s) => ({
          keys: { ...s.keys, [provider]: key },
        }));
      },

      hasKey: (provider) => {
        return get().keys[provider]?.length > 0;
      },
    }),
    { 
      name: 'jarvis-api-keys', 
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ==================== GOD MODE STORE (Real Native Bridge) ====================
// NOTE: This store only tracks the STATE of permissions, not the actual toggling.
// Actual permission requests are handled through NativeBridge in SettingsScreen.

interface GodModeStore {
  // Permission states (read-only from native)
  shizukuAccess: boolean;
  accessibilityService: boolean;
  airHandGestures: boolean;
  p2pVpn: boolean;
  
  // VPN stats
  vpnConnectedDevices: number;
  vpnProxyIp: string;
  vpnProxyPort: number;
  
  // Gesture tracking state
  gestureTracking: boolean;
  cursorPosition: { x: number; y: number } | null;
  currentGesture: string | null;
  
  // Setters (called from NativeBridge callbacks)
  setShizukuAccess: (v: boolean) => void;
  setAccessibilityService: (v: boolean) => void;
  setAirHandGestures: (v: boolean) => void;
  setP2PVpn: (v: boolean) => void;
  setVpnStats: (devices: number, ip: string, port: number) => void;
  setGestureTracking: (v: boolean) => void;
  setCursorPosition: (pos: { x: number; y: number } | null) => void;
  setCurrentGesture: (gesture: string | null) => void;
}

export const useGodModeStore = create<GodModeStore>()(
  (set) => ({
    shizukuAccess: false,
    accessibilityService: false,
    airHandGestures: false,
    p2pVpn: false,
    vpnConnectedDevices: 0,
    vpnProxyIp: '',
    vpnProxyPort: 0,
    gestureTracking: false,
    cursorPosition: null,
    currentGesture: null,

    setShizukuAccess: (v) => set({ shizukuAccess: v }),
    setAccessibilityService: (v) => set({ accessibilityService: v }),
    setAirHandGestures: (v) => set({ airHandGestures: v }),
    setP2PVpn: (v) => set({ p2pVpn: v }),
    setVpnStats: (devices, ip, port) => set({ 
      vpnConnectedDevices: devices, 
      vpnProxyIp: ip, 
      vpnProxyPort: port 
    }),
    setGestureTracking: (v) => set({ gestureTracking: v }),
    setCursorPosition: (pos) => set({ cursorPosition: pos }),
    setCurrentGesture: (gesture) => set({ currentGesture: gesture }),
  })
);

// ==================== UI STORE ====================

interface UIStore {
  showModelSelector: boolean;
  showSettings: boolean;
  cursorPosition: { x: number; y: number } | null;
  
  setShowModelSelector: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setCursorPosition: (pos: { x: number; y: number } | null) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  showModelSelector: false,
  showSettings: false,
  cursorPosition: null,

  setShowModelSelector: (show) => set({ showModelSelector: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
}));

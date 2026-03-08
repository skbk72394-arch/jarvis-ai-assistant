/**
 * JARVIS Services
 * TTS & STT Services
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useVoiceStore } from '../stores';

// ==================== TTS SERVICE ====================

class TTSService {
  private speaking = false;

  async speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
    try {
      await this.stop();
      this.speaking = true;
      useVoiceStore.getState().setState('speaking');

      await Speech.speak(text, {
        language: 'en-US',
        rate: opts?.rate || 1,
        pitch: opts?.pitch || 1,
        onDone: () => this.done(),
        onStopped: () => this.done(),
        onError: () => this.done(),
      });
    } catch {
      this.done();
    }
  }

  private done(): void {
    this.speaking = false;
    useVoiceStore.getState().setState('idle');
  }

  async stop(): Promise<void> {
    if (this.speaking) {
      await Speech.stop();
      this.done();
    }
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

// ==================== STT SERVICE ====================

class STTService {
  private recording: Audio.Recording | null = null;
  private listening = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  async start(timeout = 5000): Promise<void> {
    if (this.listening) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        useVoiceStore.getState().setState('idle');
        useVoiceStore.getState().setListening(false);
        return;
      }

      useVoiceStore.getState().setState('listening');
      useVoiceStore.getState().setListening(true);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      this.listening = true;

      this.timer = setTimeout(() => this.stop(), timeout);
    } catch {
      useVoiceStore.getState().setState('idle');
      useVoiceStore.getState().setListening(false);
    }
  }

  async stop(): Promise<string | null> {
    if (!this.listening || !this.recording) return null;

    try {
      if (this.timer) clearTimeout(this.timer);

      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.listening = false;

      useVoiceStore.getState().setListening(false);
      useVoiceStore.getState().setState('processing');

      // Note: For real STT, you would send the audio to a speech-to-text API
      await new Promise((r) => setTimeout(r, 300));

      useVoiceStore.getState().setState('idle');
      return null;
    } catch {
      useVoiceStore.getState().setState('idle');
      useVoiceStore.getState().setListening(false);
      return null;
    }
  }

  isListening(): boolean {
    return this.listening;
  }
}

// ==================== EXPORTS ====================

export const tts = new TTSService();
export const stt = new STTService();

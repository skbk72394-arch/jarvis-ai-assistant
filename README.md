# JARVIS AI Assistant

A futuristic AI assistant app built with React Native (Expo) and powered by **Ollama** - 100% FREE!

## ✨ Features

- **🤖 Multiple AI Models** - Choose from 20+ AI models including:
  - Llama 3.2, Llama 3.1 (8B, 70B)
  - Mistral 7B
  - Code Llama, DeepSeek Coder
  - Phi-3, Gemma 2, Qwen2
  - And more!

- **💰 100% FREE** - Uses Ollama for local AI processing
- **🎨 Futuristic Dark UI** - JARVIS-inspired design with neon accents
- **🎤 Voice Input** - Speech-to-text support
- **🔊 Voice Output** - Text-to-speech for AI responses
- **⚡ Streaming Responses** - Real-time text generation
- **💾 Chat History** - Persistent conversation storage

## 🚀 Quick Start

### 1. Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

### 2. Pull an AI Model
```bash
ollama pull llama3.2
```

### 3. Start Ollama Server
```bash
ollama serve
```

### 4. Install App Dependencies
```bash
cd jarvis-expo-app
npm install
```

### 5. Run the App
```bash
npx expo start
```

## 📱 Build APK with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

## 🤖 Available AI Models

| Model | Size | Best For |
|-------|------|----------|
| llama3.2:latest | 3B | General chat, fast responses |
| llama3.1:8b | 8B | Excellent all-purpose |
| mistral:7b | 7B | Fast and efficient |
| codellama:7b | 7B | Coding tasks |
| deepseek-coder:6.7b | 6.7B | Code generation |
| phi3:latest | 3.8B | Lightweight, powerful |
| gemma2:9b | 9B | Google's latest |
| qwen2:7b | 7B | Multilingual |

## 🌐 Network Configuration

For Android emulator, use:
```
http://10.0.2.2:11434
```

For physical device, use your computer's IP:
```
http://192.168.x.x:11434
```

## 📁 Project Structure

```
jarvis-expo-app/
├── App.tsx                 # Main app entry
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── eas.json                # EAS build config
├── assets/                 # Icons and splash
└── src/
    ├── screens/            # Chat screen
    ├── services/           # Ollama AI service
    ├── stores/             # Zustand state
    ├── components/         # UI components
    ├── constants/          # Theme colors
    └── navigation/         # Tab navigation
```

## 🔧 Configuration

Change AI model in the app by tapping the model button in the header, or modify defaults in:
- `src/stores/index.ts` - Default model settings
- `src/services/index.ts` - Ollama configuration

## 💡 Tips

1. **Better Performance**: Use smaller models (phi3, llama3.2) on mobile
2. **Coding Help**: Use codellama or deepseek-coder for code
3. **Creative Writing**: Use dolphin-llama3 or starling-lm
4. **Multilingual**: Use qwen2 for non-English languages

## 🆓 Why Ollama?

- **Completely FREE** - No API costs
- **Privacy** - All processing is local
- **Offline** - Works without internet
- **Unlimited** - No rate limits
- **Customizable** - Use any model you want

## 📄 License

MIT License - Free to use and modify

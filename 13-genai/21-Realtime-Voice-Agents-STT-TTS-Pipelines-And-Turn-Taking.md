# 21 — Realtime Voice Agents: STT-TTS Pipelines, Interruption Handling & Turn-Taking

> **Topic**: Building Realtime Voice Agents — From Chained STT-TTS Pipelines to Native Speech-to-Speech with OpenAI Realtime API.  
> **Core Mental Model**: Human conversation is not a request-response API. It is a continuous, bidirectional streaming loop with subconscious turn-taking, audio queuing, and barge-in interruptions.

---

## 🎙️ 1. Why Voice is Unique: Audio Serialization vs. Text LLMs

### Voice is Serializable
When you watch a video on YouTube or talk on a phone call, you hear the other person's voice in real time. How does that work?
* Audio is physical air pressure waves.
* Microphones convert these waves into electrical signals, and computers sample them thousands of times per second (e.g., 16,000 times/sec = 16 kHz).
* Each sample is converted into numbers (PCM bytes).
* Because audio is just a series of bytes, it is **serializable**—it can be streamed chunk-by-chunk over network sockets (WebSockets, WebRTC) in real time.

```
Analog Voice (Wave) ──► Microphone ──► PCM Numbers [12, -45, 89, ...] ──► Network Stream
```

### Why Weren't LLMs Trained on Voice Directly?
If voice is just serializable bytes, why did AI start with text?
1. **LLMs are trained on discrete text tokens**: Text is dense and clean. A token like `"apple"` carries pure semantic meaning.
2. **Everyone has a unique voice**: Every person has a different pitch, accent, speed, tone, and vocal frequency.
3. **High Data Footprint**: One second of speech has 16,000 to 48,000 data points. One second of text is only 2 to 3 tokens. Training an attention transformer directly on raw audio waves was historically too heavy and unstable.

Because direct voice-to-voice was difficult to train, the **Chained (Cascaded) Architecture** was born.

---

## 🏗️ 2. The Chained Architecture (STT ➔ LLM ➔ TTS)

Instead of doing speech-to-speech in one single model, we break the problem into three separate steps:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE 3-STEP CHAINED PIPELINE                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

     User Speaks                                                            Agent Speaks
          │                                                                      ▲
          ▼                                                                      │
   ┌─────────────┐             ┌─────────────────┐             ┌─────────────┐  │
   │   Step 1:   │    Text     │     Step 2:     │  Text Chunk │   Step 3:   │  │
   │  Speech-To- │ ──────────► │  Text-To-Text   │ ──────────► │  Text-To-   │ ─┘
   │  Text (STT) │  Transcript │  (LLM Thinking) │  (Response) │ Speech(TTS) │
   └─────────────┘             └─────────────────┘             └─────────────┘
    • Browser STT               • GPT-4o / Mini                 • OpenAI TTS
    • Whisper                   • Claude                        • ElevenLabs
    • Deepgram                  • LLaMA                         • Cartesia
```

1. **STT (Speech-to-Text)**: Takes incoming audio waves from the microphone and transcribes them into plain text.
2. **LLM / TTT (Text-to-Text)**: Takes the transcribed text, understands the context, and generates an answer in text.
3. **TTS (Text-to-Speech)**: Takes the generated text and converts it into realistic spoken audio using selected voices (like OpenAI's `coral`, `alloy`, `echo`, etc.).

---

## 🧱 3. The Naive Approach (The Basic Prototype)

The simplest way to build a voice agent is to wire these three stages together sequentially:

```javascript
// ============================================================================
// BASIC VOICE PROTOTYPE
// ============================================================================

const API_KEY = 'YOUR_OPENAI_API_KEY';

// 1. LLM: Sends text to OpenAI and gets text response
async function llm(userText = '') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful voice assistant. Keep answers concise.' },
        { role: 'user', content: userText },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// 2. TTS: Converts the LLM text answer into an audio blob and plays it
async function speak(text = '') {
  if (!text.trim()) return;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'coral',
      input: text,
      instructions: 'Speak in a cheerful, warm and natural tone.',
    }),
  });

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}

// 3. STT: Uses Browser SpeechRecognition to listen to microphone
async function main() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => console.log('🎤 Speech recognition started...');

  recognition.onresult = async (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log('User:', transcript);

    // Call LLM then call TTS
    const agentText = await llm(transcript);
    console.log('Agent:', agentText);

    await speak(agentText);
  };

  recognition.start();
}

main();
```

---

### Why the Naive Prototype Fails in Real Life

This naive approach works as a quick demo, but it breaks down completely when talking to it:

```
 User stops speaking
   │
   ├── [ STT processing delay ] ──────────────► 800ms
   │
   ├── [ LLM generates full answer ] ─────────► 2,000ms
   │
   ├── [ TTS synthesizes full audio ] ────────► 1,200ms
   │
   ▼
 First word played: Total delay = ~4 to 5 seconds!
```

* **The Awkward Silence**: In normal human conversation, the gap between speakers is **200ms to 400ms**. If an agent takes 4 seconds to respond, you wonder: *"Did it hear me? Is it broken?"*
* **Zero Interruption**: If the LLM generates a long paragraph, the browser plays it to completion. If you try to speak, the agent talks over you and ignores you.

---

## ⚡ 4. The Streaming Fix & The Speed Mismatch Problem

To solve the 4-second delay, we shouldn't wait for the full response. As the LLM generates words, we should **stream** them immediately into audio:

$$\text{User Speaks} \longrightarrow \text{STT} \longrightarrow \textbf{Stream Tokens} \longrightarrow \textbf{Stream Audio} \longrightarrow \text{Ear}$$

### The New Problem: The Speed Mismatch
As soon as you implement streaming, you run into a physical bottleneck:

* **APIs are fast**: An LLM generates text at **80 to 120 tokens per second**.
* **Speaking takes time**: A human voice only speaks at **2.5 to 3.5 words per second** (~150 words per minute).

```
LLM Producer:   [Token][Token][Token][Token][Token][Token]  (Ultra Fast: 100/sec)
                                 │
                                 ▼
Audio Consumer: [ --- Speaking Word 1 --- ]                (Slow: 3/sec)
```

If the model finishes generating the whole answer in 1 second, but speaking it takes 15 seconds:
* If you call `speak()` on every token, the audio plays over itself like a chaotic echo chamber.
* You need an **In-Memory Audio Queue** (`audioQueue`). Once the current chunk finishes playing (`onended`), it picks up and plays the next delta.

---

## 🧩 5. The "Masked Word" Dilemma: Token Streaming vs. Sentence Chunking

A common first thought is: *"Why not send every single word to TTS as soon as the LLM yields it?"*

This leads to the **Masked Word Dilemma**:

### How Humans Speak
When you say:
> *"Hello, how are you today?"*

You speak smoothly in one breath because your brain already knows the whole sentence before your mouth opens. Your pitch rises on *"how"* and naturally resolves on *"today?"*.

### What Happens if Words are Masked
Now imagine someone covers your eyes and only reveals one word at a time:
1. You see: `"Hello"` $\rightarrow$ You say `"Hello"`.
2. You see: `"how"` $\rightarrow$ Pause.
3. You see: `"are"` $\rightarrow$ Pause.
4. You see: `"you"` $\rightarrow$ Is it a question or a statement? You don't know until `"today?"` appears!

> **The Problem**: TTS models need surrounding context to know the correct **pronunciation, cadence, and pitch**. If you feed 1 or 2 tokens to TTS, it sounds flat, robotic, and unnatural.

### The Solution: Sentence-Level Chunking
Instead of streaming token-by-token, stream by **sentence boundaries**:
* Accumulate tokens in a small buffer.
* When you hit a delimiter (`.`, `?`, `!`, or a strong comma `,`), slice off that complete sentence.
* Send that complete sentence to TTS immediately.

```javascript
function takeSentences(text) {
  const sentences = [];
  let rest = text;

  while (true) {
    // Look for sentence-ending punctuation followed by space or end of string
    const match = rest.match(/[.?!](?:\s+|$)/);
    if (!match) break;

    const end = match.index + match[0].length;
    const sentence = rest.slice(0, end).trim();
    rest = rest.slice(end);

    if (sentence) sentences.push(sentence);
  }

  return { sentences, rest };
}
```

Now the flow is smooth:
1. The LLM streams: `"Hello there! How can I help you today?"`
2. Chunk 1 (`"Hello there!"`) is completed in ~200ms and immediately starts speaking.
3. While Chunk 1 is being spoken, Chunk 2 (`"How can I help you today?"`) finishes generating and queues up right behind it.
4. The user hears speech almost instantly, with completely natural human pronunciation!

---

## 🛑 6. Interruption Management & The 4-Step Barge-In

Now suppose the agent starts speaking:
> *"The weather in Bangalore today is pleasant with a temperature of 24 degrees and a chance of..."*

In the middle of that sentence, the user interjects:
> *"Wait, what about Delhi?"*

What happens in a naive queue?
* The queue already holds 3 more sentence chunks waiting to play.
* The LLM is still streaming Bangalore data.
* If you don't clear the queue, the agent will finish the entire paragraph about Bangalore before it ever addresses Delhi!

### The 4-Step Barge-In Teardown Protocol

Whenever the user starts to speak while the agent is talking:

```
                           USER STARTS SPEAKING
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
       [ STEP 1 ]               [ STEP 2 ]              [ STEP 3 ]
    ABORT LLM STREAM         PURGE AUDIO QUEUE       STOP ACTIVE AUDIO
  abortController.abort()   audioQueue.length = 0    currentAudio.pause()
  Stops LLM from generating Discards pending         Silences speaker
  more text                 sentences in buffer      immediately
                                     │
                                     ▼
                                [ STEP 4 ]
                         INCREMENT SESSION TOKEN
                           playbackSession++
             Discards any pending async network responses
```

```javascript
const state = {
  currentAudioObj: null,
  audioQueue: [],
  isPlaying: false,
  playbackSession: 0,
  abortController: null,
};

function triggerBargeIn() {
  // 1. Invalidate ongoing turn
  state.playbackSession++;

  // 2. Abort in-flight LLM stream fetch
  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }

  // 3. Stop active speaker sound instantly
  if (state.currentAudioObj) {
    state.currentAudioObj.pause();
    state.currentAudioObj.currentTime = 0;
    state.currentAudioObj = null;
  }

  // 4. Clear buffered audio queue
  state.audioQueue = [];
  state.isPlaying = false;
}
```

---

## 🔊 7. VAD (Voice Activity Detection) vs. Waiting for STT

In the naive prototype, we used:
```javascript
speechRecognition.interimResults = false;
speechRecognition.onresult = async function(event) { ... }
```

### The Flaw
The browser's STT only triggers `onresult` **after you stop speaking** and pause for almost a second.
* If you speak a long sentence to interrupt the agent, the agent keeps rambling over you until you finish!
* You cannot wait for transcription to interrupt. You must interrupt **the exact millisecond your voice begins**.

### The Solution: Real-Time Audio Energy (RMS)
When you speak, the microphone sound wave energy (amplitude) spikes. We can monitor this directly using the browser's Web Audio API:

```
Microphone Stream ──► AnalyserNode ──► Calculate Energy (RMS) every 20ms
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
            RMS > Energy Threshold                          RMS <= Threshold
            User is speaking!                               Silence / Room noise
                      │                                               │
                      ▼                                               ▼
              TRIGGER BARGE-IN!                                Do nothing
```

```javascript
// Calculates Root Mean Square (RMS) volume from microphone
function monitorMicEnergy(mediaStream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  const RMS_THRESHOLD = 0.08;
  let consecutiveFrames = 0;

  function loop() {
    analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);

    // If voice energy spikes while the agent is speaking: INTERRUPT!
    if (rms > RMS_THRESHOLD && state.isPlaying) {
      consecutiveFrames++;
      if (consecutiveFrames >= 4) { // Filter out micro-clicks / coughs
        triggerBargeIn();
        consecutiveFrames = 0;
      }
    } else {
      consecutiveFrames = 0;
    }

    requestAnimationFrame(loop);
  }

  loop();
}
```

---

## 🧠 8. Human Conversational Psychology & Smart Turn-Taking

Real conversation is not just code; it involves human psychology:

### A. The "Hmm / Uh-huh" Problem (Backchanneling)
When humans talk, the listener constantly says small things:
* *"Hmm"*
* *"Yeah"*
* *"Uh-huh"*
* *"Okay"*

If your agent treats every sound as an interruption and stops talking every time someone says *"hmm"*, the agent becomes unusable!

| Behavior | Duration | What It Means | Agent Action |
| :--- | :--- | :--- | :--- |
| **Backchanneling** | Short (< 250ms), quiet | *"I am listening, keep going."* | Continue speaking. |
| **Interruption** | Sustained (> 600ms), louder | *"Stop, I want to say something."* | Stop immediately and yield floor. |

### B. Information Priority & Recovery
What if the agent was in the middle of saying something critical when interrupted?
* Example: *"Your verification code is 9, 4... [User interrupts: 'Wait, slow down!']"*
* A naive agent forgets the verification code and starts a completely new conversation.
* A human-like agent stops, acknowledges the user, and then **recovers the critical context**:
  > *"No problem! Let me repeat that code for you: 9, 4, 2, 1."*

### C. Smart Turn-Taking ("Kab Kisko Bolna Hai")
Human conversation relies on subtle subconscious cues:
* A pause in the middle of a sentence (e.g., *"I was thinking... maybe we can..."*) is **not** the end of a turn.
* A finished thought with a downward pitch is the signal for the other person to speak.
* Smart agents use silence duration counters (e.g., 500ms–700ms of silence) to decide when the user has actually finished their turn.

---

## 💻 9. Complete Working Implementation: The Resilient Voice Agent

Here is the complete, modular HTML & JavaScript code putting all these concepts together:

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Realtime Voice Agent</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #111;
      color: #eee;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .box {
      width: 480px;
      padding: 24px;
      background: #1e1e1e;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    #status {
      font-size: 14px;
      color: #888;
      margin-bottom: 16px;
    }
    #chat {
      height: 220px;
      overflow-y: auto;
      border: 1px solid #333;
      padding: 12px;
      border-radius: 8px;
      background: #181818;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg { padding: 6px 10px; border-radius: 6px; font-size: 14px; max-width: 80%; }
    .msg.user { align-self: flex-end; background: #2563eb; color: #fff; }
    .msg.agent { align-self: flex-start; background: #2e2e2e; color: #eee; }
    button {
      margin-top: 16px;
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
    }
    button:disabled { background: #444; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🎙️ Realtime Voice Agent</h2>
    <div id="status">Status: Idle</div>
    <div id="chat">
      <div class="msg agent">Click start and talk naturally. You can interrupt me anytime!</div>
    </div>
    <button id="startBtn">Start Voice Agent</button>
  </div>
  <script src="script.js"></script>
</body>
</html>
```

### `script.js`

```javascript
const API_KEY = 'YOUR_OPENAI_API_KEY';

const state = {
  currentAudioObj: null,
  audioQueue: [],
  isPlaying: false,
  playbackSession: 0,
  abortController: null,
  isActive: false,
};

const statusEl = document.getElementById('status');
const chatEl = document.getElementById('chat');
const startBtn = document.getElementById('startBtn');

function setStatus(text) {
  statusEl.textContent = `Status: ${text}`;
}

function addMsg(role, text) {
  const d = document.createElement('div');
  d.className = `msg ${role}`;
  d.textContent = text;
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
  return d;
}

// 1. Interruption Handler
function triggerBargeIn() {
  if (!state.isPlaying && state.audioQueue.length === 0) return;

  console.log('⚡ Interrupted by user!');
  setStatus('Interrupted by user...');
  state.playbackSession++;

  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }

  if (state.currentAudioObj) {
    state.currentAudioObj.pause();
    state.currentAudioObj.currentTime = 0;
    state.currentAudioObj = null;
  }

  state.audioQueue = [];
  state.isPlaying = false;
}

// 2. Sentence Extractor
function takeSentences(text) {
  const sentences = [];
  let rest = text;

  while (true) {
    const match = rest.match(/[.?!](?:\s+|$)/);
    if (!match) break;
    const end = match.index + match[0].length;
    const sentence = rest.slice(0, end).trim();
    rest = rest.slice(end);
    if (sentence) sentences.push(sentence);
  }

  return { sentences, rest };
}

// 3. Streaming LLM Generator
async function* streamLLMSentences(userQuery, session) {
  state.abortController = new AbortController();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: state.abortController.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are a warm, concise voice assistant. Respond in 1-2 spoken sentences.',
        },
        { role: 'user', content: userQuery },
      ],
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sentenceAccumulator = '';

  while (true) {
    if (state.playbackSession !== session) break;
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content ?? '';
        sentenceAccumulator += delta;

        const { sentences, rest } = takeSentences(sentenceAccumulator);
        sentenceAccumulator = rest;

        for (const s of sentences) {
          if (state.playbackSession !== session) return;
          yield s;
        }
      } catch (e) {}
    }
  }

  const leftover = sentenceAccumulator.trim();
  if (leftover && state.playbackSession === session) {
    yield leftover;
  }
}

// 4. TTS Fetcher
async function fetchTTSBlob(text, session) {
  if (state.playbackSession !== session) return null;

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'coral',
      input: text,
    }),
  });

  if (state.playbackSession !== session) return null;
  return await res.blob();
}

// 5. In-Memory Sequential Audio Queue Player
async function playAudioQueue(session) {
  if (state.isPlaying || state.audioQueue.length === 0) return;
  state.isPlaying = true;
  setStatus('Agent Speaking...');

  while (state.audioQueue.length > 0) {
    if (state.playbackSession !== session) break;

    const blob = state.audioQueue.shift();
    if (!blob) continue;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    state.currentAudioObj = audio;

    await new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        state.currentAudioObj = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        state.currentAudioObj = null;
        resolve();
      };
      audio.play().catch(resolve);
    });
  }

  state.isPlaying = false;
  state.currentAudioObj = null;
  if (state.playbackSession === session) {
    setStatus('Listening...');
  }
}

// 6. Microphone Energy Monitor (VAD)
function startVAD(stream) {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);

  const data = new Float32Array(analyser.fftSize);
  let frames = 0;

  function check() {
    if (!state.isActive) return;
    analyser.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);

    if (rms > 0.08 && state.isPlaying) {
      frames++;
      if (frames >= 4) {
        triggerBargeIn();
        frames = 0;
      }
    } else {
      frames = 0;
    }

    requestAnimationFrame(check);
  }

  check();
}

// 7. Main Entry
async function start() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert('Use Chrome browser.');

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  startVAD(stream);

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    state.isActive = true;
    startBtn.disabled = true;
    setStatus('Listening...');
  };

  recognition.onresult = async (event) => {
    const text = event.results[event.results.length - 1][0].transcript.trim();
    if (!text) return;

    addMsg('user', text);
    setStatus('Thinking...');

    const session = ++state.playbackSession;
    let agentMsgEl = null;

    try {
      for await (const sentence of streamLLMSentences(text, session)) {
        if (state.playbackSession !== session) break;

        if (!agentMsgEl) {
          agentMsgEl = addMsg('agent', sentence);
        } else {
          agentMsgEl.textContent += ' ' + sentence;
        }

        fetchTTSBlob(sentence, session).then((blob) => {
          if (!blob || state.playbackSession !== session) return;
          state.audioQueue.push(blob);
          playAudioQueue(session);
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  };

  recognition.start();
}

startBtn.onclick = start;
```

---

## 🚀 10. Native Multimodal Voice: The OpenAI Realtime API

Even with sentence streaming and queues, cascaded pipelines have a hard ceiling:
1. **Lost Emotion**: Plain text cannot represent whispers, laughing, sarcasm, or accents.
2. **Fixed Latency**: Transcribing audio into text and back into audio always takes at least 500ms–800ms.

### The New Solution: Direct Speech-to-Speech
The **OpenAI Realtime API** (`gpt-4o-realtime-preview`) is a single multimodal model that takes **raw audio in** and generates **raw audio out** directly over **WebRTC**:

$$\text{User Mic} \xrightarrow{\quad\text{WebRTC}\quad} \fbox{ GPT-4o Realtime } \xrightarrow{\quad\text{WebRTC}\quad} \text{Speaker}$$

### How to Build It (2 Files: Server + Client)

#### 1. Backend: Mint Ephemeral Token (`server.js`)
```javascript
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Creates a short-lived token so API key stays hidden
app.post('/session', async (req, res) => {
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'coral',
      modalities: ['audio', 'text'],
      turn_detection: {
        type: 'server_vad', // Server automatically handles turn-taking & barge-in!
        threshold: 0.5,
        silence_duration_ms: 500,
      },
    }),
  });

  const data = await response.json();
  res.json(data);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

#### 2. Frontend: WebRTC Realtime Agent (`client.js`)
```javascript
async function startRealtimeAgent() {
  // 1. Get token from server
  const sessionRes = await fetch('/session', { method: 'POST' });
  const session = await sessionRes.json();
  const token = session.client_secret.value;

  // 2. Setup WebRTC
  const pc = new RTCPeerConnection();

  // Play audio when agent responds
  const audio = document.createElement('audio');
  audio.autoplay = true;
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

  // Add user microphone stream
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(mic.getTracks()[0]);

  // Data channel for text and status
  const dc = pc.createDataChannel('oai-events');
  dc.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type === 'input_audio_buffer.speech_started') {
      console.log('⚡ User interrupted the agent!');
    }
  };

  // 3. Negotiate connection with OpenAI
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch(
    'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
    {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
    }
  );

  await pc.setRemoteDescription({
    type: 'answer',
    sdp: await sdpResponse.text(),
  });

  console.log('🎉 Connected! Realtime full-duplex voice active (<300ms latency).');
}
```

---

## 📊 11. Comparison: Chained Pipeline vs. Native Realtime API

| Feature | Chained Pipeline (STT + LLM + TTS) | Native Multimodal (OpenAI Realtime) |
| :--- | :--- | :--- |
| **Response Time** | 800ms – 2,000ms | **Sub-300ms** (Instant) |
| **Emotion & Tone** | Flat / Pre-programmed | **Natural** (Whispers, laughter, sighs) |
| **Interruption (Barge-in)** | You must build queue + RMS VAD yourself | **Built-in automatically on server** |
| **Cost** | Cheap (~$0.01 – $0.03 / min) | Higher (~$0.06 – $0.20 / min) |
| **Flexibility** | Swap any STT, LLM, or TTS provider | Locked into OpenAI Realtime model |
| **Best Used For** | Cheap bulk calls, survey bots | High-end human-like conversational agents |

---

## 📌 Summary Checklist
1. **Audio is serializable**: It flows as continuous bytes.
2. **Speed Mismatch**: LLMs produce words faster than human speech; you must use an **in-memory audio queue**.
3. **Sentence Chunking**: Do not stream word-by-word; stream sentence-by-sentence so pronunciation and pitch stay natural.
4. **Barge-In**: When interrupted, **abort LLM fetch + clear queue + stop speaker + bump session**.
5. **Immediate VAD**: Interrupt on microphone wave energy (RMS), not on STT transcript completion.
6. **Next Generation**: Native speech-to-speech (OpenAI Realtime API) removes chaining altogether for sub-300ms real conversation.

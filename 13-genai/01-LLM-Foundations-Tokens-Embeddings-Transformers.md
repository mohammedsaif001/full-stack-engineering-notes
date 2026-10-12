# 01 — LLM Foundations: How Large Language Models Actually Work

> **Cohort Series**: Generative AI Notes  
> **Topic**: How LLMs work under the hood in plain English — Tokenization, Embeddings, Positional Encoding, Self-Attention & Transformers  
> **Core Rule**: No complicated academic jargon. Everything explained simply with everyday real-world examples!  

---

## 💡 The Big Secret: What Does an LLM Actually Do?

Before we talk about fancy words like Transformers and Attention, let's understand what a Large Language Model (LLM) **actually does** in the simplest possible terms:

> **An LLM is just a pattern-guessing machine. You give it a sequence, and it predicts what comes next.**

### The Counting Example (How it Works)

Imagine playing a guessing game:

1. **Round 1**: You feed the model:  
   👉 `1, 2, 3`  
   The model guesses what comes next: **`4`**

2. **Round 2**: Now you take that result and feed the whole sequence back in:  
   👉 `1, 2, 3, 4`  
   The model guesses what comes next: **`5`**

3. **Round 3**: You feed the updated sequence in again:  
   👉 `1, 2, 3, 4, 5`  
   The model guesses what comes next: **`6`**

```
   You pass: [ 1, 2, 3 ]          ──► LLM predicts: "4"
   You pass: [ 1, 2, 3, 4 ]       ──► LLM predicts: "5"
   You pass: [ 1, 2, 3, 4, 5 ]    ──► LLM predicts: "6"
   You pass: [ 1, 2, 3, 4, 5, 6 ] ──► LLM predicts: "7"
```

**That is the entire foundation of Generative AI!** It doesn't answer questions by "thinking"; it simply completes the pattern.

---

## 🔑 1. The Core Terms: Prompt, Token & Generative

To understand this game, here are the 3 words you need to know:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PROMPT  : The starting input you give to the model (e.g. "1, 2, 3" or    │
│              "Write a small story about me").                               │
│                                                                             │
│ 2. TOKEN   : The pieces of words or numbers that the model reads and writes.│
│              (Instead of letters, it processes "tokens").                   │
│                                                                             │
│ 3. GENERATIVE: The model creates (generates) new tokens one by one by       │
│                predicting the next most likely piece.                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### From Numbers to Real Words

Now replace numbers with everyday words. When you type into ChatGPT:  
👉 Prompt: *"Write a small story about me"*

Here is the step-by-step guessing game happening in milliseconds:

```
Step 1: Input Prompt ──► "Write a small story about me"
        Model Guesses ──► "Sure"

Step 2: New Input    ──► "Write a small story about me Sure"
        Model Guesses ──► ","

Step 3: New Input    ──► "Write a small story about me Sure,"
        Model Guesses ──► " Cute"

Step 4: New Input    ──► "Write a small story about me Sure, Cute"
        Model Guesses ──► " Piyush"

Step 5: New Input    ──► "Write a small story about me Sure, Cute Piyush"
        Model Guesses ──► " Garg!"
```

It is literally an **autocomplete on steroids**.

---

## 🚗 2. What Does "GPT" Actually Stand For?

Just like Toyota, Honda, and BMW build cars, OpenAI built **GPT**.

```
                ┌─────────────────────────────────────────────────────────┐
                │                         G P T                           │
                └─────────────────────────────────────────────────────────┘
                   │                         │                         │
                   ▼                         ▼                         ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  Generative  │          │  Pre-trained │          │  Transformer │
            └──────────────┘          └──────────────┘          └──────────────┘
             Generates the next        Already read the          The clever way
             word/token based on       whole internet            the engine is 
             what came before it.      before you ever           wired up to 
                                       talked to it.             understand context.
```

1. **G (Generative)**: It doesn't just copy-paste from a database; it generates new text token by token.
2. **P (Pre-trained)**: It spent months reading billions of internet pages, books, and code before you ever opened the app.
3. **T (Transformer)**: The special engine architecture (invented by Google in 2017) that makes reading and generating tokens super fast.

---

## 🪜 The 5 Simple Steps From Human Words to AI Answers

To turn your sentence into a reply, the model does 5 steps:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. TOKENIZATION       : Turn words into numbers.                            │
│ 2. EMBEDDINGS         : Give those numbers a location on a map (meaning).   │
│ 3. POSITIONAL ENCODING: Add the order of the words (who came first).        │
│ 4. SELF-ATTENTION     : Let the words "talk" to each other to get context.  │
│ 5. PREDICT NEXT TOKEN : Guess the best next word and output it.             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Let's break down each step in plain English.

---

## 🔤 Step 1: Tokenization (Turning Words into Numbers)

Computers don't understand letters like `A, B, C` or words like `Piyush`. They only understand **numbers**.

So before anything happens, the computer takes your sentence and chops it into pieces called **Tokens**, and looks up each piece in a giant dictionary (called a **Vocabulary**).

### The Vocabulary (The Model's Dictionary)

Imagine a huge dictionary where every word or syllable has a roll-number:

```
┌───────────────┬─────────────────┐
│ Word / Piece  │ Number (Token ID)│
├───────────────┼─────────────────┤
│ "Ex"          │ 0               │
│ "The"         │ 1               │
│ "Spoon"       │ 2               │
│ "P"           │ 3               │
│ ...           │ ...             │
│ "Hello"       │ 13225           │
│ ","           │ 11              │
└───────────────┴─────────────────┘
```

### The Example:

If you type:
> **"Hello, I am Piyush Garg"**

The tokenizer cuts it up and converts it into a list of numbers:

```
  "Hello"   ──►  13225
  ","       ──►  11
  " I"      ──►  357
  " am"     ──►  939
  " P"      ──►  398
  "iy"      ──►  3403
  "ush"     ──►  1776
  " Garg"   ──►  170676
```

So the model actually receives:  
`[ 13225, 11, 357, 939, 398, 3403, 1776, 170676 ]`

> [!NOTE]
> **Why doesn't it split by whole words?**  
> If it only knew whole words, any new name or typo like `Piyush` wouldn't be in the dictionary!  
> By splitting rare words into little puzzle pieces (`P` + `iy` + `ush`), the computer can read **any** word on earth without getting stuck.

---

## 📍 Step 2: Embeddings (Plotting Words on a Map)

Now we have numbers like `13225`. But here is the problem:  
To a computer, the number `5` is not "friends" with the number `6`. They are just dumb numbers. The computer still doesn't know what the word *means*.

So we give every word **GPS coordinates on a giant map**. This map is called **Embedding Space**.

### The Map Concept:

On a regular map:
* New York and Washington D.C. are close to each other.
* Paris and London are close to each other.
* Tokyo is far away from Paris.

On a **Word Map**:
* Words with similar meanings sit right next to each other!
* `"Dog"` and `"Puppy"` sit right next to each other.
* `"Ice Cream"` and `"Gelato"` sit together.
* `"Eiffel Tower"` is far away from `"Burger"`.

### The Exact Coordinate Map (From the Lecture):

Look at how the 4 concepts are plotted across the graph quadrants:

```
                                         ▲ Y-Axis
                                         │
       [ Quadrant 2: Monuments ]         │
                                         │
          ★ Eiffel Tower                 │
          │                              │
        3 │ (Vector Distance = 3)        │
          ▼                              │
          ★ Statue of Liberty            │
                 ▲                       │
                  \                      │
                   \                     │
────────────────────\────────────────────┼─────────────────────────────────► X-Axis
                     \                   │
                      \                  │
                       \                 │        [ Quadrant 4: Places ]
                        \                │
                         \               │           ★ Paris
                          \              │           │
                           \             │         3 │ (Vector Distance = 3)
                            \            │           ▼
                             ────────────┼─────────► ★ US
                                         │
```

### Why This Is Mind-Blowing (Vector Magic):

1. **Parallel Distances**:
   * The distance & direction from **Eiffel Tower $\to$ Statue of Liberty** is **`3`**.
   * The distance & direction from **Paris $\to$ US** is ALSO **`3`**!
2. **Diagonal Connections**:
   * Draw a line from **Paris $\to$ Eiffel Tower** (The landmark of that place).
   * Draw a line from **US $\to$ Statue of Liberty** (The landmark of that place).
   * Both diagonal lines are completely parallel and identical!

### Word Math (Vector Arithmetic):
Because words are plotted as coordinates on this map, you can do real math with concepts:

$$\text{Eiffel Tower} - \text{Paris} + \text{US} = \text{Statue of Liberty}$$

$$\text{King} - \text{Man} + \text{Woman} = \text{Queen}$$

The computer doesn't "know" geography or history like a human—it simply understands that **the geometric angle and distance between these points match!**

---

## ⏱️ Step 3: Positional Encoding (The Order of Words Matters!)

Older AI models read sentences slowly, word by word from left to right (like a human reading a book). That was too slow.

Transformers are super-fast because they look at **all the words at the exact same second**.

### But Here is the Catch!

If you look at all words at once, you lose the order! Look at these two sentences:

1. **"Piyush loves [x]"**  *(Piyush is doing the loving)*
2. **"[x] loves Piyush"**  *(Someone else is loving Piyush)*

Both sentences have the **exact same words**: `Piyush`, `loves`, `[x]`.  
If you just throw them into a bag, the computer has no idea who loves who!

```
                  HOW WE FIX IT: STICKERS WITH NUMBERS!

     [ Piyush ]   +   Sticker: "I am Word #1"   ──►   Piyush (at position 1)
     [ loves  ]   +   Sticker: "I am Word #2"   ──►   loves  (at position 2)
     [  [x]   ]   +   Sticker: "I am Word #3"   ──►   [x]    (at position 3)
```

We add a special math stamp called **Positional Encoding** to each word. Now the computer knows both:
1. **What the word means** (from the Embedding map).
2. **Where the word sits in the sentence** (from the Positional stamp).

---

## 🗣️ Step 4: Self-Attention (Letting Tokens Talk to Each Other)

In 2017, a team of researchers at Google published a world-changing paper:  
📄 **"Attention Is All You Need"**

This introduced the single most important idea in modern AI: **Self-Attention**.

> **Plain English Definition**:  
> **Self-Attention is when tokens look around and "talk" to the other words in the sentence so they understand the true context.**

### Why Attention Matters: The Word "BANK"

What does the word **"BANK"** mean?  
You can't answer that until you see the words next to it!

```
Scenario A: "I deposited 10,000 rupees in ICICI BANK"
Scenario B: "We sat and had a picnic by the RIVER BANK"
```

```
               [ ICICI ] ◄──────────┐
                   │                │  Attention links them together!
                   ▼                │  
               [ BANK ] ────────────┘  ──► Meaning becomes: MONEY / FINANCIAL PLACE


               [ RIVER ] ◄──────────┐
                   │                │  Attention links them together!
                   ▼                │  
               [ BANK ] ────────────┘  ──► Meaning becomes: WATER / RIVER EDGE
```

* In Scenario A: The word `"BANK"` looks at `"ICICI"` and says: *"Aha! We are talking about money and accounts!"*
* In Scenario B: The word `"BANK"` looks at `"RIVER"` and says: *"Aha! We are talking about water and nature!"*

Before attention, `"BANK"` was just a generic word.  
**After self-attention, the words have talked to each other, and the confusion is gone.**

---

## 🏗️ Step 5: How Transformers Process Text Internally

What actually happens inside the Transformer engine when you send a message?

Think of a Transformer as a **multi-story office building (e.g. 32 to 96 floors high)**:

```
                      TRANSFORMER INTERNAL PROCESSING PIPELINE

   [ Output: Guess Next Token ] ──► (Probability: "Sure" 85%, "Of" 10%)
                ▲
                │
   ┌────────────────────────┐
   │ Floor 96: Final Tweaks │ ◄── Highest-level abstract reasoning & logic
   └────────────▲───────────┘
                │
              .....
                │
   ┌────────────────────────┐
   │ Floor 2: Grammar Layer │ ◄── Understands subjects, verbs, and pronouns
   └────────────▲───────────┘
                │
   ┌────────────────────────┐
   │ Floor 1: Word Matching │ ◄── Understands basic word pairs & definitions
   └────────────▲───────────┘
                │
   ┌────────────────────────┐
   │ Input: Embeddings +    │ ◄── "Hello, I am Piyush Garg"
   │ Positional Stamps      │
   └────────────────────────┘
```

On **every single floor**, two things happen:
1. **Self-Attention (The Meeting)**: Tokens share notes with each other to update context.
2. **Feed-Forward Network (Individual Thinking)**: Each token sits at its own desk and "thinks" about what it just learned from the meeting.

By the time the information reaches the top floor, the model has an ultra-deep understanding of your entire sentence!

---

## 🪟 6. Context Windows: The LLM's Working Memory

What is a **Context Window**?

> **Mental Model**: The Context Window is the **size of the desk** the AI has to work on.  
> It is the maximum number of tokens (words/numbers) the model can see at one single time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE CONTEXT WINDOW (DESK SPACE)                       │
│                                                                             │
│  [ SYSTEM PROMPT ] + [ CHAT HISTORY ] + [ YOUR QUESTION ] = TOTAL TOKENS   │
│                                                                             │
│  ◄────────────────────────── MAXIMUM CAPACITY ──────────────────────────►   │
│                 (e.g., 8,000 / 32,000 / 128,000 Tokens)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

* **Early GPT-3**: Had a desk of only **2,048 tokens** (~1,500 words).
* **GPT-4**: Expanded to **8k**, then **32k**, then **128,000 tokens** (~300 pages of a book!).
* **Gemini 1.5 Pro**: Has up to **2,000,000 tokens** (an entire library!).

### What Happens When You Exceed the Context Window?

What happens if you have an 8,000-token limit, but your conversation hits 10,000 tokens?

```
                      WHAT HAPPENS WHEN CONTEXT OVERFLOWS

   Original Conversation:
   [Turn 1: "My name is Saif"] ──► [Turn 2] ──► [Turn 3] ──► [Turn 40] ──► [Turn 41]
   ▲
   │ (Oldest memory pushed off the desk!)
   ▼
   Truncted Conversation Sent to LLM:
   [Turn 5] ──► [Turn 6] ──► ..... ──► [Turn 40] ──► [Turn 41: "What is my name?"]
                                                          │
                                                          ▼
                                                  LLM replies: "I'm sorry,
                                                  I don't know your name!"
```

1. **Forgetting / Amnesia (Sliding Window)**:  
   To make room for new words, the application must **throw away the oldest words**. The model literally forgets what you told it at the beginning of the chat!
2. **API Crash (`context_length_exceeded`)**:  
   If your app does not trim the text and tries to shove 10,000 tokens into an 8,000 limit, the API throws an error: `400 Bad Request: Context window exceeded`.
3. **"Lost in the Middle" (Context Rot)**:  
   Even if an LLM supports 128k tokens, when you give it massive documents, it pays maximum attention to the **beginning** and the **end**, and can easily overlook facts buried in the middle!
4. **Higher Costs & Latency**:  
   Attention has to compare every word against every other word. Bigger context = more GPU compute = slower response times and higher bills.

---

## 🎲 7. Controlling Randomness: Temperature vs Top-P

When the model is ready to pick the next word, it produces a scoreboard of probabilities:

```
Suppose the prompt is: "I had tea with a spoon of..."
  • "sugar"   ──► 70% chance
  • "honey"   ──► 18% chance
  • "milk"    ──►  9% chance
  • "salt"    ──►  2.9% chance
  • "sand"    ──►  0.1% chance
```

How does the AI decide which word to pick? You control it with two knobs: **Temperature** and **Top-P**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               TEMPERATURE                                   │
│                     (The "Confidence / Spice" Dial)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Changes how confident or flat the probability numbers are.                 │
│                                                                             │
│ • Temp = 0.0 : Greedy. Always picks the #1 highest winner ("sugar").        │
│                Never gambles. 100% predictable.                             │
│ • Temp = 0.7 : Balanced. Usually picks "sugar", sometimes picks "honey".    │
│ • Temp = 1.5 : Wild & Unstable. Flattens probabilities so rare words        │
│                like "salt" or "sand" get picked!                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                      vs

┌─────────────────────────────────────────────────────────────────────────────┐
│                           TOP-P (Nucleus Sampling)                          │
│                          (The "Cutoff Filter" Dial)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Sets a cutoff percentage pool and throws away all the garbage words below.  │
│                                                                             │
│ • Top-P = 0.90 : Take words from the top until their total sum reaches 90%. │
│   ["sugar" (70%) + "honey" (18%) + "milk" (9%) = 97%].                      │
│   "salt" and "sand" are completely discarded!                               │
│                                                                             │
│ • Top-P = 0.10 : Only the top 10% pool is allowed (only "sugar").           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Use Which? (Golden Rules for Engineers)

| Use Case | Recommended Settings | Why? |
|---|---|---|
| **Coding, Math, JSON Extraction** | `Temp = 0.0`, `Top-P = 1.0` | You want strict, deterministic accuracy. Zero guessing. |
| **Customer Support Chatbot** | `Temp = 0.3`, `Top-P = 0.8` | Friendly and natural, but stays grounded and rarely goes off script. |
| **Creative Writing & Brainstorming** | `Temp = 0.8`, `Top-P = 0.9` | High variety, creative vocabulary, and fresh ideas. |

> [!TIP]
> **Pro Tip from OpenAI & Anthropic**:  
> Only adjust **either** Temperature **or** Top-P at a time—do **not** tweak both at once, or debugging why your model generated weird responses will be impossible!

---

## 🔁 8. Training vs Inferencing: The Two Life Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. TRAINING (Learning Phase)                                                │
│    • Done by big AI labs (OpenAI, Google, Meta).                            │
│    • Costs millions of dollars and takes weeks on thousands of superchips.  │
│    • The model reads the entire internet, hides the last word, and practices│
│      guessing it trillions of times until it gets really smart.             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. INFERENCING (Using Phase)                                                │
│    • This is what happens right now when you type into ChatGPT!             │
│    • The model's brain is frozen (it's not learning anything new).          │
│    • It just takes your prompt and guesses the response words one by one.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 The 1-Minute Summary Cheat Sheet

| Term | What is it in plain English? | Everyday Analogy |
|---|---|---|
| **Token** | A piece of a word turned into a number. | A Lego brick of language. |
| **Vocabulary** | The master list of all word pieces the AI knows. | A dictionary where every word has a roll number. |
| **Embedding** | Putting a word on a high-dimensional map. | Giving words GPS coordinates so related words sit together. |
| **Positional Encoding** | Stamping the word's position in the sentence. | Numbered badges so words don't lose their place in line. |
| **Self-Attention** | Letting words look at their neighbors to understand context. | The word `"Bank"` checking if `"ICICI"` or `"River"` is sitting next to it. |
| **Transformer** | The multi-floor neural network running attention + thinking layers. | A factory processing words from basic syllables to deep meaning. |
| **Context Window** | The maximum memory capacity the model can hold at once. | The size of your desk. When it's full, old papers fall off! |
| **Temperature** | Controls how confident or wild the word choices are. | The spice level of the food. |
| **Top-P** | Filters out bizarre words by only considering the top P% candidate pool. | Bouncers at a club only letting the top VIPs in. |
| **Training** | Reading the whole internet to learn patterns. | Going to school for years. |
| **Inferencing** | Answering your prompt right now. | Taking the exam in real-time. |


<div align="center">

#  Cut Points

### AI Co-Editor for Podcast & Video Creators


**IBM AI Builders Challenge · July 2026** · *Creative Industries — Content Creation & Editorial Tools*

---

</div>

## 🎙️ The Problem

Podcast and video editors spend hours per episode manually scrubbing raw recordings just to find the parts worth cutting — before any real editing even begins.

- **Dead air and awkward pauses** are easy to miss by ear over a 60–90 minute recording
- **Tangents and off-topic rambling** are even harder to catch — nothing "sounds wrong," the conversation just drifted
- Existing AI tools do **one or the other** — a silence detector or a transcript summarizer — never both, and never in a way an editor can actually verify before trusting the cut
- The scarce resource isn't generation, it's **judgment** — knowing *which* moment to cut and *why*

Cut Points solves this by giving editors both signals, side by side, with the reasoning shown — not just a timestamp to trust blindly.

---

## 💡 What It Does

| Feature | Description |
|---|---|
| ✂️ **Signal-Based Cut Detection** | Decodes the real audio waveform and runs windowed RMS loudness analysis to flag **dead air** and **energy dips** — deterministic, no AI, no hallucination risk |
| 🤖 **AI Tangent Detection** | Reads the transcript against your stated episode topic and flags passages that drift off-topic, with a plain-English reason grounded to a real transcript timestamp |
| 🌊 **Interactive Waveform Timeline** | Every flagged cut renders directly on the waveform at its real position — click any marker to jump playback there |
| ✅ **Accept / Reject Review** | Every AI and signal suggestion is a proposal, not a verdict — the editor accepts or rejects each one individually, keeping a human in the loop |
| ⏱️ **Live Runtime Counter** | Original duration → new duration → time saved, updating in real time as cuts are accepted |
| 💬 **Ask the Episode** | Ask natural-language questions about your own uploaded episode ("where did we mention pricing?") and get an answer with a clickable timestamp |
| 📤 **Real Edit-List Export** | Exports an actual **Premiere Pro marker XML**, **Audacity label track**, or **CSV** — built to be imported into a real editor's workflow, not just read as a report |
| 🔐 **Accounts & History** | Sign up, log in, and revisit every past episode's analysis and export from a saved history — nothing has to be re-uploaded |
| 🛠️ **Settings & Preferences** | Configurable silence threshold, default export format, and account management |
| 🧭 **How It Works Demo** | A guided walkthrough page with mock data, so a new user (or a judge) understands the full flow in under a minute without uploading anything |

---

## 🏗️ How It Works

```
Upload (audio + transcript + topic)
        │
        ├── Signal Engine (client-side, Web Audio API)
        │     → decode → mono mix → windowed RMS (250ms) → dB conversion
        │     → rolling 5s average → flag dead_air (< −42dB) and
        │       energy_dip (10dB below local average)
        │
        └── AI Engine (OpenAI GPT-4o)
              → transcript + stated topic → grounded, timestamped
                tangent detection → JSON-validated response only,
                every timestamp must exist verbatim in the transcript
        │
        ▼
   Merged, sorted cut list → rendered on waveform + review panel
        │
        ▼
   Accept / Reject → Export (Premiere XML / Audacity / CSV)
```

Both engines run independently and are shown **together on the same timeline**, so a suggested cut is only trusted once it's visible *and* explained — the core design principle of the project.

---

## 🤖 How IBM Bob Was Used

IBM Bob was used as the primary development tool throughout the build:

- **Ask mode** — understanding and reviewing generated logic (e.g. the RMS threshold detection in the signal engine) before integrating it
- **Plan mode** — designing the accept/reject cut-review flow and the history/settings data model before implementation
- **Code mode** — implementing feature additions, error handling (corrupted/unsupported audio files), and edge-case fixes (overlapping accepted cuts in the export list)


---

## 🚀 Getting Started

```bash
# install dependencies
bun install

# configure environment 
# add your own OpenAI key
echo "OPENAI_API_KEY=sk-..." >> .env

# run locally
bun run dev
```

Then open **http://localhost:5173** (or the port shown in your terminal).

---

## 📤 Export Formats

| Format | Use case |
|---|---|
| **Premiere Pro Markers (XML)** | File → Import, drops in as a marker track |
| **Audacity Labels (.txt)** | File → Import → Labels |
| **CSV Edit List** | Spreadsheets, Notion, or handing off to a human editor |

---

## 🎨 Design

Beige/cream base with hot-pink and lavender accents, Fredoka display type, Poppins body text, and Space Mono for timecodes — built to feel like a creative tool, not a dashboard.

---


# SimpliFy - ELI5 Explainer Web App 🚀

SimpliFy is a modern, beautifully designed web application that leverages the power of the **Google Gemini API** to take incredibly complex topics and break them down so simply that a 5-year-old (or complete beginner) can understand them intuitively.

## ✨ Features

- **Dynamic Gemini Discovery**: The app securely links your Google API key and directly interrogates the `v1beta` models endpoint to dynamically map, pull, and bind to your highest-performing natively supported "Flash" model (such as `gemini-2.5-flash` or `gemini-1.5-flash`), completely bypassing stubborn legacy API errors!
- **Premium Light-Fade UI**: Clean, engaging glassmorphism design built strictly with vanilla technologies for maximum speed and absolute lightness.
- **Limitless AI Explanations**: Capable of generating immensely deep but easy-to-understand bullet-point breakdowns, real-world analogies, and the "future impacts" without cutting off mid-sentence. 
- **Multi-Language Support**: Generate explanations natively across English, Spanish, French, German, Hindi, Japanese, Chinese, Arabic, and Portuguese.
- **Local Library Persistence**: Any explanation you love can be saved instantly to your local Library where it is permanently retained across browser sessions.
- **One-Click Clipboard**: Easily copy the generated markdown structured answers.
- **Zero-Server Reliability**: 100% Client-side. Everything happens locally within your browser.

## 🛠️ Tech Stack

- **HTML5 & Vanilla CSS3**: For blazing fast animations, custom properties, and structure.
- **Vanilla JavaScript (ES6)**: To cleanly handle state logic, DOM manipulation, and REST endpoints.
- **marked.js**: To parse and render beautiful AI-generated markdown.

## 🚀 How to Run Locally

You don't need `npm`, Node.js, or complex build pipelines to run SimpliFy.

1. **Clone or Download** this folder to your machine.
2. Spin up a quick local server so CORS allows the `app.js` module imports. Using Python:
   ```bash
   python -m http.server 3000
   ```
3. Open your browser and navigate to `http://localhost:3000`.

## ⚙️ Configuration (Getting Started)

Before you begin generating explanations, you need to plug in a free Google Gemini API key.

1. Get a **FREE Google API Key** from [Google AI Studio](https://aistudio.google.com/).
2. Click the specific **Settings Gear** `⚙️` icon in the top right corner of the SimpliFy app.
3. Paste your API key and click **Verify & Save Settings**.
4. The application will instantly ping Google, confirm your key's validity, bind to the best Flash model natively supported by your key, and light up **Green** to confirm connection.
5. You're ready! Start typing in topics like "Quantum Computing" or "Black Holes" and click **Simplify It**.

## 🛑 Notes on Privacy

Your Google API key is saved explicitly to your browser's persistent `localStorage`. It is **never** sent to any third-party server besides Google's official `generativelanguage.googleapis.com` endpoints when triggering the simplification process.

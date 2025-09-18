import React, { useState, useEffect, useRef } from "react";
import "./index.css";

function Chatbot({ onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const [isRecording, setIsRecording] = useState(false);
  const [voices, setVoices] = useState([]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const API_KEY = "AIzaSyCOc9l_AEMdQGqTnjFp9Gclh77CZYRHN9Q";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // handle resize for mobile keyboard
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 700);
      if (messagesContainerRef.current) {
        const headerHeight = isMobile ? 70 : 0; // approx header + padding
        const inputHeight = 70; // approx input height
        messagesContainerRef.current.style.height = `${window.innerHeight - headerHeight - inputHeight}px`;
        scrollToBottom();
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const stripMarkdown = (text) => text.replace(/[*_~`#>]/g, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/_(.*?)_/g, "$1").replace(/`/g, "").replace(/\n\s*\n/g, "\n");

  const detectLanguage = (text) => {
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
    if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
    if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
    return "en-US";
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectLanguage(text);
    utterance.rate = 0.9;
    let voice = voices.find((v) => v.lang === utterance.lang);
    if (!voice) voice = voices.find((v) => v.lang.startsWith(utterance.lang.split("-")[0]));
    if (!voice) voice = voices.find((v) => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", text: input }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] }),
      });
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Server error.";
      const cleanedText = stripMarkdown(reply);
      setMessages((prev) => [...prev, { role: "model", text: cleanedText }]);
      speakText(cleanedText);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "Server error." }]);
    }
    setIsLoading(false);
    scrollToBottom();
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") sendMessage(); };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) { alert("Speech recognition not supported"); return; }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => { setInput(event.results[0][0].transcript); sendMessage(); };
    recognition.start();
  };

  return (
    <div className={isMobile ? "chatbot-fullscreen" : "chatbot-container"}>
      {isMobile && (
        <div className="chatbot-header-bar">
          <span className="chatbot-back">Heritage AI</span>
          <span className="chatbot-close-btn" onClick={onClose}>×</span>
        </div>
      )}

      <div className="chatbot-messages" ref={messagesContainerRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chatbot-message ${msg.role === "user" ? "user" : "ai"}`}>
            <div className="chat-message-content">{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chatbot-message ai">
            <span className="typing-dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-container">
        <input type="text" placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
        <button onClick={sendMessage}>➤</button>
        <button onClick={startListening}>{isRecording ? "🎙️..." : "🎤"}</button>
      </div>
    </div>
  );
}

export { Chatbot };

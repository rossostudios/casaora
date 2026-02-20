"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionResultList = {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionInstance)
    | null;
}

const SILENCE_TIMEOUT_MS = 2000;

export function useVoiceChat(onFinalTranscript: (text: string) => void) {
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef("");
  const voiceModeRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const hasStt =
    typeof window !== "undefined" && getSpeechRecognitionConstructor() !== null;
  const hasTts = typeof window !== "undefined" && "speechSynthesis" in window;
  const isSupported = hasStt && hasTts;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!hasTts) return;
      window.speechSynthesis.cancel();
      const stripped = text.replace(/[#*_`~>[\]()!|]/g, "").trim();
      if (!stripped) return;
      const utterance = new SpeechSynthesisUtterance(stripped);
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
        ) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [hasTts]
  );

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    const final = accumulatedRef.current.trim();
    if (final) {
      onFinalRef.current(final);
    }
    accumulatedRef.current = "";
    setTranscript("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      typeof navigator !== "undefined" ? navigator.language : "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearSilenceTimer();
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalText) {
        accumulatedRef.current += finalText;
      }
      setTranscript(accumulatedRef.current + interim);

      // Reset silence timer
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          // Stop and send what we have
          const text = accumulatedRef.current.trim();
          if (text) {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            try {
              recognitionRef.current.stop();
            } catch {
              /* ignore */
            }
            recognitionRef.current = null;
            setIsListening(false);
            onFinalRef.current(text);
            accumulatedRef.current = "";
            setTranscript("");
            // Restart listening if voice mode still active
            if (voiceModeRef.current) {
              setTimeout(() => {
                if (voiceModeRef.current) startListening();
              }, 300);
            }
          }
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onend = () => {
      // Auto-restart if voice mode still active and we didn't manually stop
      if (voiceModeRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setIsListening(false);
        setVoiceModeActive(false);
        voiceModeRef.current = false;
        return;
      }
      // For transient errors, let onend handle restart
    };

    recognitionRef.current = recognition;
    accumulatedRef.current = "";
    setTranscript("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [clearSilenceTimer]);

  const toggleVoiceMode = useCallback(() => {
    if (voiceModeRef.current) {
      // Deactivate
      voiceModeRef.current = false;
      setVoiceModeActive(false);
      stopListening();
      stopSpeaking();
    } else {
      // Activate
      voiceModeRef.current = true;
      setVoiceModeActive(true);
      startListening();
    }
  }, [startListening, stopListening, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearSilenceTimer]);

  return {
    isSupported,
    voiceModeActive,
    isListening,
    isSpeaking,
    transcript,
    toggleVoiceMode,
    speak,
    stopSpeaking,
    stopListening,
  };
}

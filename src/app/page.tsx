"use client";

import { useEffect, useRef, useState } from "react";
import AuthPanel from "./auth-panel";
import { analyzeIncident } from "@/lib/incident-analysis";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Report = {
  category: string;
  title: string;
  location: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "Assigned" | "Resolved";
  time: string;
};

const initialReports: Report[] = [
  { category: "WATER", title: "Broken water pipe", location: "Kisii University", priority: "High", status: "Open", time: "12 min ago" },
  { category: "ROADS", title: "Potholes along Nyanchwa", location: "Kisii Town", priority: "Medium", status: "Assigned", time: "48 min ago" },
  { category: "WASTE", title: "Collection point overflowing", location: "Daraja Mbili", priority: "Low", status: "Resolved", time: "Yesterday" },
];

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [reports, setReports] = useState(initialReports);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [isAdditionalInfo, setIsAdditionalInfo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const reportTranscriptRef = useRef("");

  useEffect(() => {
    if (!isListening) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isListening]);

  function speakResponse(message: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const response = new SpeechSynthesisUtterance(message);
    response.lang = "en-KE";
    response.rate = 0.95;
    window.speechSynthesis.speak(response);
  }

  function createFallbackQuestion(spokenText: string) {
    const summary = spokenText.replace(/\s+/g, " ").trim().slice(0, 96);
    const ending = summary.length === spokenText.trim().length ? "" : "...";
    return `You mentioned ${summary}${ending}. What is the exact location or nearest landmark?`;
  }

  function handleListenPress() {
    if (isListening || isTranscribing) return;
    const collectingAdditionalInfo = isFollowUp && !isAdditionalInfo && transcript.trim().length >= 10;
    if (collectingAdditionalInfo) setIsAdditionalInfo(true);
    void startListening(isFollowUp, collectingAdditionalInfo);
  }

  async function startListening(followUp = isFollowUp, collectingAdditionalInfo = isAdditionalInfo) {
    try {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      if (!data.user) {
        const message = "Please sign up or sign in before making a report.";
        setSubmissionError(message);
        speakResponse(message);
        return;
      }
    } catch {
      setSubmissionError("The account service is unavailable. Please try again.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setSubmissionError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsListening(false);
        setSubmissionError("The microphone stopped unexpectedly. Please try again.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const recordingType = recorder.mimeType.startsWith("audio/") ? recorder.mimeType : "audio/webm";
        const recording = new Blob(audioChunksRef.current, { type: recordingType });
        const extension = recording.type.includes("mp4") ? "mp4" : recording.type.includes("ogg") ? "ogg" : "webm";
        void transcribeRecording(recording, `sauti-report.${extension}`, followUp, collectingAdditionalInfo);
      };
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      transcriptRef.current = "";
      setTranscript("");
      setSubmissionError("");
      setElapsed(0);
      setIsListening(true);
      recorder.start(250);
    } catch {
      setSubmissionError("Microphone permission was denied or unavailable.");
    }
  }

  function stopListening() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    else mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    setIsListening(false);
  }

  async function transcribeRecording(recording: Blob, filename: string, followUp: boolean, collectingAdditionalInfo: boolean) {
    if (!recording.size) return;
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("audio", recording, filename);
    try {
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: formData });
      const result: { transcript?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to transcribe recording");
      transcriptRef.current = result.transcript?.trim() ?? "";
      setTranscript(transcriptRef.current);
      if (!followUp) {
        reportTranscriptRef.current = transcriptRef.current;
        const questionResponse = await fetch("/api/voice/follow-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: transcriptRef.current }),
        });
        const questionResult: { question?: string; error?: string } = await questionResponse.json();
        const question = questionResult.question ?? createFallbackQuestion(transcriptRef.current);
        setFollowUpQuestion(question);
        speakResponse(`I heard: ${transcriptRef.current}. ${question}`);
      } else if (!collectingAdditionalInfo) {
        reportTranscriptRef.current = `${reportTranscriptRef.current} ${transcriptRef.current}`.trim();
        const question = "Thank you. Is there any other information you would like to add?";
        setFollowUpQuestion(question);
        speakResponse(question);
      } else {
        reportTranscriptRef.current = `${reportTranscriptRef.current} ${transcriptRef.current}`.trim();
        setFollowUpQuestion("");
        speakResponse("Thank you. I have all the information I need. Your report is ready to submit.");
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to transcribe recording");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function submitReport() {
    setSubmissionError("");
    const spokenTranscript = transcriptRef.current.trim();
    if (spokenTranscript.length < (isAdditionalInfo ? 1 : 10)) {
      setSubmissionError("Please speak for a moment so SAUTI can create your report.");
      return;
    }

    if (!isFollowUp) {
      setIsFollowUp(true);
      setTranscript("");
      transcriptRef.current = "";
      void startListening(true, false);
      return;
    }

    if (!isAdditionalInfo) {
      setIsAdditionalInfo(true);
      setTranscript("");
      transcriptRef.current = "";
      void startListening(true, true);
      return;
    }

    const completeTranscript = reportTranscriptRef.current.trim();
    const analysis = analyzeIncident(completeTranscript);
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: analysis.title,
          description: completeTranscript,
          category: analysis.category,
          severity: analysis.severity,
          location_name: analysis.location_name,
          language: "en",
          transcript: completeTranscript,
        }),
      });

      const result: { reference_number?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to submit report");
      if (!result.reference_number) throw new Error("Unable to submit report");

      setHasSubmitted(true);
      setReferenceNumber(result.reference_number);
      setIsListening(false);
      setTranscript("");
      setFollowUpQuestion("");
      setIsFollowUp(false);
      setIsAdditionalInfo(false);
      reportTranscriptRef.current = "";
      window.speechSynthesis?.cancel();
      setReports((current) => [
        { category: analysis.category, title: analysis.title, location: analysis.location_name ?? "Community report", priority: analysis.severity === "CRITICAL" || analysis.severity === "HIGH" ? "High" : analysis.severity === "LOW" ? "Low" : "Medium", status: "Open", time: "Just now" },
        ...current,
      ]);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to submit report");
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar"><a className="brand" href="#top"><span className="brand-mark">S</span> SAUTI <span className="brand-country">/ KE</span></a><div className="nav-links"><a href="#reports">Community reports</a><a href="#how-it-works">How it works</a><button className="language-button">EN <span>/</span> SW</button></div><AuthPanel /></nav>
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> COMMUNITY LISTENING POST · KISII COUNTY</p><h1>Your voice<br /><em>moves things.</em></h1><p className="hero-intro">Report what matters in your community. Speak naturally in English or Swahili and SAUTI will turn your words into action.</p><div className="trust-row"><span>◎</span> Built for every voice <i /> <span>⌁</span> Private by design</div></div><div className={`voice-panel ${isListening ? "is-listening" : ""}`}><div className="panel-top"><span>{isListening ? (isAdditionalInfo ? "ADDITIONAL INFORMATION" : isFollowUp ? "FOLLOW-UP QUESTION" : "SAUTI IS LISTENING") : isTranscribing ? "SAUTI IS TRANSCRIBING" : "READY WHEN YOU ARE"}</span><span className="panel-time">{isListening ? `00:${String(elapsed).padStart(2, "0")}` : "01"}</span></div><div className="waveform" aria-hidden="true">{Array.from({ length: 25 }).map((_, index) => <span key={index} style={{ "--bar": `${18 + ((index * 17) % 44)}px` } as React.CSSProperties} />)}</div><p className="follow-up-prompt">{isFollowUp && followUpQuestion}</p><button className="listen-button" onPointerDown={handleListenPress} onPointerUp={stopListening} onPointerCancel={stopListening} disabled={isTranscribing} aria-label={isListening ? "Release to stop speaking" : "Press and hold to speak"}><span className="mic-icon">{isListening ? "■" : "◉"}</span><span>{isListening ? "RELEASE TO REVIEW" : isTranscribing ? "TRANSCRIBING" : "HOLD TO SPEAK"}</span><span className="button-arrow">↗</span></button><button className="submit-voice-button" onClick={submitReport} disabled={isListening || isTranscribing || transcript.length < (isAdditionalInfo ? 1 : 10)}>{!isFollowUp ? "Answer follow-up" : !isAdditionalInfo ? "Answer: any other information?" : "Submit complete report"}</button><p className="voice-hint">{isListening ? "Keep holding while you speak" : isTranscribing ? "AssemblyAI is preparing your response..." : transcript ? `&quot;${transcript}&quot;` : "No forms. No typing. Just speak."}</p></div></section>
      <section className="activity-section" id="reports"><div className="section-heading"><div><p className="eyebrow">LIVE FROM THE COMMUNITY</p><h2>What people are saying</h2></div><button className="see-all">View all reports <span>↗</span></button></div><div className="content-grid"><div className="reports-list">{reports.slice(0, 3).map((report, index) => <article className="report-row" key={`${report.title}-${index}`}><div className={`report-icon ${report.category.toLowerCase()}`}>{report.category === "WATER" ? "≈" : report.category === "ROADS" ? "+" : "♧"}</div><div className="report-details"><div className="report-meta"><span>{report.category}</span><time>{report.time}</time></div><h3>{report.title}</h3><p><span>⌖</span> {report.location}</p></div><div className="report-status"><span className={`priority ${report.priority.toLowerCase()}`}><i /> {report.priority}</span><span className={`status ${report.status.toLowerCase()}`}>{report.status}</span></div></article>)}</div><div className="map-card"><div className="map-header"><span>REPORTS NEAR YOU</span><span className="map-live"><i /> LIVE</span></div><div className="map-art"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><span className="map-pin pin-one">+</span><span className="map-pin pin-two">+</span><span className="map-pin pin-three">+</span><div className="map-label"><strong>Kisii County</strong><span>3 active reports</span></div></div></div></div></section>
      <section className="how-section" id="how-it-works"><p className="eyebrow">ONE CONVERSATION</p><h2>From speaking<br /><em>to solving.</em></h2><div className="steps"><div><b>01</b><strong>Speak freely</strong><p>Tell SAUTI what you see, in the language that feels natural.</p></div><div><b>02</b><strong>We make sense of it</strong><p>Our AI asks the right follow-up questions and finds the details.</p></div><div><b>03</b><strong>Action starts here</strong><p>Your report reaches the right people, with a reference number to follow.</p></div></div></section>
      {(isListening || isTranscribing) && <div className="transcript-toast"><span className="toast-dot" /><div><small>{isTranscribing ? "ASSEMBLYAI RESPONSE" : "MICROPHONE INPUT"}</small><p>&quot;{transcript || (isTranscribing ? "Transcribing your recording..." : "Listening...")}&quot;</p></div><button onClick={isListening ? stopListening : () => setIsTranscribing(false)} aria-label="Close transcript">×</button></div>}
      {hasSubmitted && <div className="success-toast"><span>✓</span><div><small>REPORT SUBMITTED</small><p>Reference <strong>{referenceNumber}</strong> · Thanks for speaking up.</p></div><button onClick={() => setHasSubmitted(false)} aria-label="Dismiss notification">×</button></div>}
      {submissionError && <div className="success-toast"><span>!</span><div><small>REPORT NOT SENT</small><p>{submissionError}</p></div><button onClick={() => setSubmissionError("")} aria-label="Dismiss error">×</button></div>}
      <footer><span>SAUTI / 2026</span><span>Made for the people who make places better.</span><span>EN · SW</span></footer>
    </main>
  );
}

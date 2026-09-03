"use client";

import { useEffect, useState } from "react";

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

const transcript = "There is a broken water pipe outside Kisii University. Water is flowing onto the road...";

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [reports, setReports] = useState(initialReports);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isListening) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isListening]);

  function toggleListening() {
    setIsListening((value) => !value);
    setElapsed(0);
  }

  async function submitReport() {
    setSubmissionError("");
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Broken water pipe",
          description: transcript,
          category: "WATER",
          severity: "HIGH",
          location_name: "Kisii University",
          language: "en",
          transcript,
        }),
      });

      if (!response.ok) throw new Error("Unable to submit report");
      const result: { reference_number: string } = await response.json();

      setHasSubmitted(true);
      setReferenceNumber(result.reference_number);
      setIsListening(false);
      setReports((current) => [
        { category: "WATER", title: "Broken water pipe", location: "Kisii University", priority: "High", status: "Open", time: "Just now" },
        ...current,
      ]);
    } catch {
      setSubmissionError("We couldn't connect to SAUTI right now. Please try again.");
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar"><a className="brand" href="#top"><span className="brand-mark">S</span> SAUTI <span className="brand-country">/ KE</span></a><div className="nav-links"><a href="#reports">Community reports</a><a href="#how-it-works">How it works</a><button className="language-button">EN <span>/</span> SW</button></div><button className="profile-button" aria-label="Open profile">AM</button></nav>
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> COMMUNITY LISTENING POST · KISII COUNTY</p><h1>Your voice<br /><em>moves things.</em></h1><p className="hero-intro">Report what matters in your community. Speak naturally in English or Swahili and SAUTI will turn your words into action.</p><div className="trust-row"><span>◎</span> Built for every voice <i /> <span>⌁</span> Private by design</div></div><div className={`voice-panel ${isListening ? "is-listening" : ""}`}><div className="panel-top"><span>{isListening ? "SAUTI IS LISTENING" : "READY WHEN YOU ARE"}</span><span className="panel-time">{isListening ? `00:${String(elapsed).padStart(2, "0")}` : "01"}</span></div><div className="waveform" aria-hidden="true">{Array.from({ length: 25 }).map((_, index) => <span key={index} style={{ "--bar": `${18 + ((index * 17) % 44)}px` } as React.CSSProperties} />)}</div><button className="listen-button" onClick={isListening ? submitReport : toggleListening} aria-label={isListening ? "Submit report" : "Start speaking"}><span className="mic-icon">{isListening ? "■" : "◉"}</span><span>{isListening ? "TAP TO SUBMIT" : "HOLD TO SPEAK"}</span><span className="button-arrow">↗</span></button><p className="voice-hint">{isListening ? "Review complete · submit your report" : "No forms. No typing. Just speak."}</p></div></section>
      <section className="activity-section" id="reports"><div className="section-heading"><div><p className="eyebrow">LIVE FROM THE COMMUNITY</p><h2>What people are saying</h2></div><button className="see-all">View all reports <span>↗</span></button></div><div className="content-grid"><div className="reports-list">{reports.slice(0, 3).map((report, index) => <article className="report-row" key={`${report.title}-${index}`}><div className={`report-icon ${report.category.toLowerCase()}`}>{report.category === "WATER" ? "≈" : report.category === "ROADS" ? "+" : "♧"}</div><div className="report-details"><div className="report-meta"><span>{report.category}</span><time>{report.time}</time></div><h3>{report.title}</h3><p><span>⌖</span> {report.location}</p></div><div className="report-status"><span className={`priority ${report.priority.toLowerCase()}`}><i /> {report.priority}</span><span className={`status ${report.status.toLowerCase()}`}>{report.status}</span></div></article>)}</div><div className="map-card"><div className="map-header"><span>REPORTS NEAR YOU</span><span className="map-live"><i /> LIVE</span></div><div className="map-art"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><span className="map-pin pin-one">+</span><span className="map-pin pin-two">+</span><span className="map-pin pin-three">+</span><div className="map-label"><strong>Kisii County</strong><span>3 active reports</span></div></div></div></div></section>
      <section className="how-section" id="how-it-works"><p className="eyebrow">ONE CONVERSATION</p><h2>From speaking<br /><em>to solving.</em></h2><div className="steps"><div><b>01</b><strong>Speak freely</strong><p>Tell SAUTI what you see, in the language that feels natural.</p></div><div><b>02</b><strong>We make sense of it</strong><p>Our AI asks the right follow-up questions and finds the details.</p></div><div><b>03</b><strong>Action starts here</strong><p>Your report reaches the right people, with a reference number to follow.</p></div></div></section>
      {isListening && <div className="transcript-toast"><span className="toast-dot" /><div><small>LIVE TRANSCRIPT</small><p>&quot;{transcript}&quot;</p></div><button onClick={toggleListening} aria-label="Close transcript">×</button></div>}
      {hasSubmitted && <div className="success-toast"><span>✓</span><div><small>REPORT SUBMITTED</small><p>Reference <strong>{referenceNumber}</strong> · Thanks for speaking up.</p></div><button onClick={() => setHasSubmitted(false)} aria-label="Dismiss notification">×</button></div>}
      {submissionError && <div className="success-toast"><span>!</span><div><small>REPORT NOT SENT</small><p>{submissionError}</p></div><button onClick={() => setSubmissionError("")} aria-label="Dismiss error">×</button></div>}
      <footer><span>SAUTI / 2026</span><span>Made for the people who make places better.</span><span>EN · SW</span></footer>
    </main>
  );
}

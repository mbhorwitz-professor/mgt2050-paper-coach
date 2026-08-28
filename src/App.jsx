import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import {
  getOrCreatePaperProject,
  loadProjectMessages,
  saveMessage,
  saveCurrentStage,
  markStageCompleted,
} from "./persistence";
const stages = [
  {
    number: 1,
    name: "Topic Discovery",
    title: "Discover a topic worth exploring",
    checkpoint: "Topic exploration",
    nextAction: "Connect experience to management",
  },
  {
    number: 2,
    name: "Topic Selection",
    title: "Choose and narrow your management topic",
    checkpoint: "Topic selection",
    nextAction: "Compare possible topics",
  },
  {
    number: 3,
    name: "Understanding Check",
    title: "Show what you understand before researching",
    checkpoint: "Understanding check",
    nextAction: "Separate knowledge from assumptions",
  },
  {
    number: 4,
    name: "Research Planning",
    title: "Plan a responsible research strategy",
    checkpoint: "Research plan",
    nextAction: "Identify evidence you need",
  },
  {
    number: 5,
    name: "Source Analysis",
    title: "Read and analyze your sources",
    checkpoint: "Source analysis",
    nextAction: "Explain what each source contributes",
  },
  {
    number: 6,
    name: "Cross-Source Synthesis",
    title: "Put your sources into conversation",
    checkpoint: "Literature synthesis",
    nextAction: "Compare agreements and tensions",
  },
  {
    number: 7,
    name: "Thesis Development",
    title: "Develop a defensible thesis",
    checkpoint: "Thesis",
    nextAction: "Make a claim supported by evidence",
  },
  {
    number: 8,
    name: "Outline Review",
    title: "Build and test your paper structure",
    checkpoint: "Outline",
    nextAction: "Check the logic of your argument",
  },
  {
    number: 9,
    name: "Analysis Challenge",
    title: "Pressure-test your analysis",
    checkpoint: "Analysis challenge",
    nextAction: "Consider alternatives and limitations",
  },
  {
    number: 10,
    name: "Final Editing Review",
    title: "Strengthen your own draft",
    checkpoint: "Editing review",
    nextAction: "Improve clarity without surrendering authorship",
  },
  {
    number: 11,
    name: "AI-Use Reflection",
    title: "Document and reflect on your AI use",
    checkpoint: "AI-use reflection",
    nextAction: "Explain how AI supported your learning",
  },
];

const openingMessages = {
  1: [
    "Welcome. We’ll build your paper one decision at a time. You stay the author; I’ll help you question, test, and strengthen your thinking.",
    "Think about a manager, coach, supervisor, teacher, team leader, or organization you have observed. What interests you about how that person or organization managed people, decisions, or results?",
  ],
  2: [
    "You now have possible directions. Let’s narrow them without choosing for you.",
    "Which topic seems most meaningful, manageable, and clearly connected to management—and why?",
  ],
  3: [
    "Before research begins, I want to understand what you already think.",
    "What do you believe is true about your topic right now, and which parts might only be assumptions?",
  ],
  4: [
    "Now we move from interest to evidence.",
    "What would you need to learn from credible research before you could answer your management question responsibly?",
  ],
  5: [
    "I’ll help you analyze sources you have actually found and read.",
    "Start with one source. In your own words, what question or problem is this source addressing?",
  ],
  6: [
    "One source is not a literature review. Let’s compare what your sources are saying.",
    "Where do two of your sources agree, disagree, or emphasize different parts of the problem?",
  ],
  7: [
    "Your thesis should be your judgment after working with the evidence.",
    "Based on what you have learned so far, what claim do you think the evidence allows you to make?",
  ],
  8: [
    "Now let’s test the structure of your argument.",
    "What are the major sections of your paper, and what job does each section need to do?",
  ],
  9: [
    "A strong paper survives reasonable challenge.",
    "What is the strongest alternative explanation, limitation, or objection to your current argument?",
  ],
  10: [
    "I can help you edit what you wrote, but I will not rewrite the paper for you.",
    "What part of your draft feels least clear or least convincing to you?",
  ],
  11: [
    "The final step is to make your use of AI transparent.",
    "Where did the coach genuinely improve your thinking, and where did you reject or revise its suggestions?",
  ],
};

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [view, setView] = useState("student");
  const [currentStage, setCurrentStage] = useState(1);
  const [message, setMessage] = useState("");
  const [messagesByStage, setMessagesByStage] = useState({});
  const [showMemory, setShowMemory] = useState(false);
const [project, setProject] = useState(null);
const [projectLoading, setProjectLoading] = useState(false);
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        await loadProfile(session.user.id);
      }

      setAuthLoading(false);
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setView("student");
        }

        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Unable to load profile:", error);
      return;
    }

    setProfile(data);
  }

  const stage = useMemo(
    () => stages.find((item) => item.number === currentStage),
    [currentStage]
  );

  const currentMessages =
    messagesByStage[currentStage] ||
    openingMessages[currentStage].map((text) => ({
      sender: "coach",
      text,
    }));

async function sendMessage() {
  const trimmed = message.trim();

  if (!trimmed) return;

  const existing =
    messagesByStage[currentStage] ||
    openingMessages[currentStage].map((text) => ({
      sender: "coach",
      text,
    }));

  const studentMessage = {
    sender: "student",
    text: trimmed,
  };

  const pendingMessages = [...existing, studentMessage];

  setMessagesByStage((previous) => ({
    ...previous,
    [currentStage]: pendingMessages,
  }));

  setMessage("");

  try {
    const response = await fetch("/.netlify/functions/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stageNumber: currentStage,
        message: trimmed,
        messages: pendingMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "The coach could not complete the request."
      );
    }

    const coachMessage = {
      sender: "coach",
      text: data.reply,
    };

    setMessagesByStage((previous) => ({
      ...previous,
      [currentStage]: [
        ...(previous[currentStage] || pendingMessages),
        coachMessage,
      ],
    }));
  } catch (error) {
    console.error("Coach request failed:", error);

    const errorMessage = {
      sender: "coach",
      text:
        "I’m having trouble reaching the coaching service right now. Please try again in a moment.",
    };

    setMessagesByStage((previous) => ({
      ...previous,
      [currentStage]: [
        ...(previous[currentStage] || pendingMessages),
        errorMessage,
      ],
    }));
  }
}  
  function advanceStage() {
    if (currentStage < stages.length) {
      setCurrentStage((value) => value + 1);
    }
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p>Loading your paper coach…</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">N</div>

        <div className="brand-copy">
          <div className="eyebrow">
            NOVA SOUTHEASTERN UNIVERSITY · MGT 2050
          </div>
          <h1>Individual Management Paper Coach</h1>
        </div>

        <div className="view-switch" aria-label="Choose workspace">
          <button
            className={view === "student" ? "selected" : ""}
            onClick={() => setView("student")}
          >
            Student
          </button>

          {profile?.role === "instructor" && (
            <button
              className={view === "instructor" ? "selected" : ""}
              onClick={() => setView("instructor")}
            >
              Instructor
            </button>
          )}
        </div>

        <div className="header-actions">
          <span className="prototype-tag">Production build</span>
          <button className="quiet-button">Presenter guide</button>
          <button className="quiet-button">Assignment</button>

          <button
            className="quiet-button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>

          <button
            className="avatar"
            aria-label="Profile"
            title={profile?.email || ""}
          >
            {(profile?.full_name || profile?.email || "U")
              .slice(0, 2)
              .toUpperCase()}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="stage-panel">
          <div className="stage-heading">
            <span>PAPER PATH</span>
            <strong>{currentStage} of 11</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(currentStage / stages.length) * 100}%`,
              }}
            />
          </div>

          <nav aria-label="Paper coaching stages">
            {stages.map((item) => (
              <button
                key={item.number}
                className={`stage-row ${
                  currentStage === item.number ? "active" : ""
                }`}
                onClick={() => setCurrentStage(item.number)}
              >
                <span className="stage-number">{item.number}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="chat-panel">
          {view === "student" ? (
            <>
              <div className="chat-header">
                <div>
                  <span className="status-dot" />
                  <span className="stage-label">STAGE {currentStage}</span>

                  <h2>{stage.title}</h2>

                  <p>
                    I’ll ask one question at a time. You make the final
                    decisions.
                  </p>
                </div>

                <div className="chat-header-actions">
  <button
    className="memory-button"
    onClick={() => setShowMemory((value) => !value)}
  >
    What I remember
  </button>

  <button
    className="quiet-button"
    onClick={() => {
      alert(
        "Your progress is saved. You can return whenever you're ready."
      );
    }}
  >
    Pause for now
  </button>

  <button
    className="continue-button"
    onClick={advanceStage}
    disabled={currentStage === stages.length}
  >
    Continue to next step →
  </button>
</div>
              </div>

              {showMemory && (
                <div className="memory-panel">
                  <strong>Coach memory</strong>
                  <p>
                    Your topic, management question, research decisions,
                    source analysis, thesis, outline, and stage progress will
                    appear here once persistence is connected.
                  </p>
                </div>
              )}

              <div className="messages" aria-live="polite">
                <div className="day-marker">
                  <span>Today</span>
                </div>

                {currentMessages.map((item, index) => (
                  <div
                    className={`message-row ${item.sender}`}
                    key={`${item.sender}-${index}`}
                  >
                    <div className="message-avatar">
                      {item.sender === "coach" ? "C" : "S"}
                    </div>

                    <div className="message-bubble">{item.text}</div>
                  </div>
                ))}
              </div>

              <div className="coaching-boundary">
  <strong>Your thinking first.</strong>{" "}
  Use your own words. The coach may question, challenge,
  organize, and help you connect your ideas to management
  concepts, but it will not write your paper for you.
</div>

<div className="pace-cue">
  <strong>You’re in control of the pace.</strong>{" "}
  You can pause at any time and return later, or move to the
  next step when you feel you’ve done enough thinking for now.
</div>

                <div className="composer">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell your coach what you’re thinking…"
                    aria-label="Message your paper coach"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  <button
                    className="send-button"
                    disabled={!message.trim()}
                    onClick={sendMessage}
                  >
                    Send
                  </button>
                </div>

                <div className="composer-meta">
                  <span>Enter to send · Shift + Enter for a new line</span>
                  <span>Student-authored · AI-assisted</span>
                </div>
              </div>
            </>
          ) : (
            <div className="instructor-view">
              <span className="stage-label">INSTRUCTOR WORKSPACE</span>

              <h2>Class progress dashboard</h2>

              <p>
                This workspace will display authenticated student progress
                from Supabase after persistence is connected.
              </p>

              <div className="instructor-placeholder-grid">
                <div>
                  <strong>Students</strong>
                  <span>—</span>
                </div>

                <div>
                  <strong>Active projects</strong>
                  <span>—</span>
                </div>

                <div>
                  <strong>Checkpoint progress</strong>
                  <span>—</span>
                </div>

                <div>
                  <strong>Students needing follow-up</strong>
                  <span>—</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="context-panel">
          <div className="context-card next-action">
            <span className="card-kicker">NEXT ACTION</span>
            <h3>{stage.nextAction}</h3>
            <p>Work through the current question before moving forward.</p>
          </div>

          <div className="context-card method-card">
            <span className="card-kicker">COACHING METHOD</span>

            <h3>Student-led support</h3>

            <p>
              The coach may ask follow-up questions to deepen your thinking.
  You do not have to finish a stage in one sitting. Pause when
  you need to, return later, or move forward when you feel ready.
            </p>
          </div>

          <div className="context-card">
            <div className="card-row">
              <span className="card-kicker">CHECKPOINT</span>
              <span className="status-tag">In progress</span>
            </div>

            <h3>{stage.checkpoint}</h3>

            <ul>
              <li>Student thinking captured</li>
              <li>Management connection tested</li>
              <li>Evidence or assumptions examined</li>
              <li>Student makes the final decision</li>
            </ul>
          </div>

          <div className="context-card due-card">
            <span className="card-kicker">COURSE</span>
            <strong>MGT 2050</strong>
            <span>Individual Management Paper</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;

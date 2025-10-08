import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function CodeArena() {
  const [view, setView] = useState("problem"); // problem | profile

  const [problem, setProblem] = useState([]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/problems');
        if (!response.ok) throw new Error('Failed to fetch problems');
        const data = await response.json();
        setProblem(data.problems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const [selectedProblemId, setSelectedProblemId] = useState(problem[0].id);
  const selectedProblem = problem.find((p) => p.id === selectedProblemId);

  const [code, setCode] = useState(selectedProblem.defaultCode);
  const [language, setLanguage] = useState("javascript");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    setCode(selectedProblem.defaultCode);
    setOutput("");
  }, [selectedProblemId]);

  useEffect(() => {
    // Fetch user profile and achievements from backend
    fetch("http://localhost:5000/user/123")
      .then((res) => res.json())
      .then((data) => setUserProfile(data))
      .catch(() => setUserProfile(null));
  }, []);

  async function handleRun() {
    setIsRunning(true);
    setOutput("");
    try {
      const res = await fetch("http://localhost:8080/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const data = await res.json();
      setOutput(data.output);
    } catch (err) {
      setOutput("Error connecting to backend");
    }
    setIsRunning(false);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setOutput("");
    try {
      const res = await fetch("http://localhost:8080/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: selectedProblem.id }),
      });
      const data = await res.json();
      setOutput(data.result);
      if (data.achievements) {
        setUserProfile((prev) => ({ ...prev, achievements: data.achievements }));
      }
    } catch (err) {
      setOutput("Error connecting to backend");
    }
    setIsSubmitting(false);
  }

  const editorRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleRun();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, language, stdin, selectedProblem]);

  const filtered = problem.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white font-bold">CA</div>
            <div>
              <h1 className="text-lg font-semibold">CodeArena</h1>
              <p className="text-xs text-slate-500">Practice, compete, and level up — demo UI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {view === "problem" && (
              <input
                type="text"
                placeholder="Search problems, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border rounded-md bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            )}
            <button onClick={() => setView(view === "problem" ? "profile" : "problem")} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">
              {view === "problem" ? "My Profile" : "Back to Problems"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      {view === "problem" ? (
        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">
          {/* LEFT: Problem List */}
          <aside className="col-span-3 bg-white border rounded-lg p-3 h-[70vh] overflow-auto">
            <h2 className="font-semibold mb-3">Problems</h2>
            <div className="space-y-2">
              {filtered.map((p) => (
                <motion.div key={p.id} onClick={() => setSelectedProblemId(p.id)} whileHover={{ scale: 1.01 }} className={`p-3 rounded-md cursor-pointer border ${p.id === selectedProblemId ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-slate-500">{p.tags.join(" • ")}</div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${p.difficulty === "Easy" ? "bg-green-100 text-green-700" : p.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.difficulty}</div>
                  </div>
                </motion.div>
              ))}
              {filtered.length === 0 && <div className="text-sm text-slate-500">No problems match your search.</div>}
            </div>
          </aside>

          {/* CENTER: Editor area */}
          <section className="col-span-6 bg-white border rounded-lg p-3 flex flex-col" style={{ minHeight: '70vh' }}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedProblem.title}</h3>
                <div className="text-base text-slate-700 mt-1 leading-relaxed">{selectedProblem.statement}</div>
              </div>
              <div className="flex items-center gap-2">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-2 py-1 border rounded-md text-sm">
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++</option>
                </select>
                <button onClick={handleRun} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm" disabled={isRunning}>{isRunning ? "Running..." : "Run (Ctrl+Enter)"}</button>
                <button onClick={handleSubmit} className="px-3 py-2 border rounded-md text-sm" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit"}</button>
              </div>
            </div>

            <textarea ref={editorRef} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="flex-1 p-3 font-mono text-sm resize-none outline-none border rounded-md h-[50%] mb-3" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Custom Input</label>
                <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} className="w-full mt-1 p-2 border rounded-md h-24 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Output</label>
                <pre className="w-full mt-1 p-2 border rounded-md h-24 text-sm bg-slate-900 text-white overflow-auto">{output || "<no output>"}</pre>
              </div>
            </div>
          </section>

          {/* RIGHT: Problem details */}
          <aside className="col-span-3 bg-white border rounded-lg p-3 h-[70vh] overflow-auto">
            <h4 className="font-semibold mb-2">Details</h4>
            <div className="text-sm text-slate-600">
              <div><strong>Constraints:</strong> {selectedProblem.constraints}</div>
              <div className="mt-2"><strong>Tags:</strong> {selectedProblem.tags.join(", ")}</div>
            </div>

            <h4 className="font-semibold mt-4 mb-2">Examples</h4>
            <div className="space-y-2">
              {selectedProblem.examples.map((ex, idx) => (
                <div key={idx} className="p-2 border rounded-md bg-slate-50 text-sm">
                  <div className="text-xs text-slate-500">Input</div>
                  <div className="font-mono text-sm">{ex.in}</div>
                  <div className="text-xs text-slate-500 mt-2">Output</div>
                  <div className="font-mono text-sm">{ex.out}</div>
                </div>
              ))}
            </div>
          </aside>
        </main>
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Profile page unchanged */}
        </main>
      )}

      <footer className="max-w-7xl mx-auto px-4 pb-6 text-center text-xs text-slate-500">Built with ❤️ — demo UI. Backend connected at http://localhost:5000.</footer>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AIReviewer from "./AIReviewer";
import { useParams } from "react-router-dom";

export default function CodeArena() {
  const [view, setView] = useState("problem");
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState(null);

  const [code, setCode] = useState("function twoSum(nums, target) {  \n// write your solution here  \nreturn [];\n}\nconst args = process.argv.slice(3);\nif (args.length < 3) {\n  console.error(\"Usage: node twoSum.js <num1> <num2> ... <target>\");\n  process.exit(1);\n}\n\nconst num = parseInt(args[0]);\nconst target = parseInt(args[args.length - 1]);\nconst nums = args.slice(1, args.length - 1).map(Number);\nconst result = twoSum(nums, target);\nconst str = `[${result.join(\",\")}]`;\nconsole.log(str);");
  const [language, setLanguage] = useState("javascript");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [isAIReviewerOpen, setIsAIReviewerOpen] = useState(false);
  const { slug } = useParams();

  const defaultCodes = {
    javascript: "function twoSum(nums, target) {  \n// write your solution here  \nreturn [];\n}\nconst args = process.argv.slice(2);\nif (args.length < 3) {\n  console.error(\"Usage: node twoSum.js <num1> <num2> ... <target>\");\n  process.exit(1);\n}\n\nconst num = parseInt(args[0]);\nconst target = parseInt(args[args.length - 1]);\nconst nums = args.slice(1, args.length - 1).map(Number);\nconst result = twoSum(nums, target);\nconst str = `[${result.join(\",\")}]`;\nconsole.log(str);",
    python: `def solve(input):\n    # write your code here\n    return input\n\nprint(solve('Hello World'))`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  string input;\n  getline(cin, input);\n  cout << input;\n  return 0;\n}`,
    java: `import java.util.*;\nclass Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    String input = sc.nextLine();\n    System.out.println(input);\n  }\n}`
  };

  useEffect(() => {
  fetch(`http://localhost:8080/api/problems/${slug}`)
    .then(res => res.json())
    .then(data => {
      setSelectedProblemId(`${slug}`);
      setCode(data.defaultCode?.javascript || '');
    });
}, [slug]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/problems");
        if (!response.ok) throw new Error("Failed to fetch problems");
        const data = await response.json();

        // API returns { problems: [...] }
        const fetchedProblems = data.map((problem) => ({
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          tags: problem.tags || [],
          statement: problem.statement,
          constraints: problem.constraints,
          examples: problem.examples || [],
          defaultCode: problem.defaultCode, 
          testcases: problem.testcases || [],
        }));

        setProblems(fetchedProblems);


      } catch (err) {
        console.error("Error fetching problems:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const selectedProblem = problems.find((p) => p.id === selectedProblemId);
  useEffect(()=> setCode(selectedProblem?.defaultCode[language] || defaultCodes[language]),[language])

  useEffect(() => {
    if (selectedProblem) {
      setCode(selectedProblem.defaultCode[language] || defaultCodes[language]);
      setOutput("");
    }
  }, [selectedProblemId]);

  // useEffect(() => {
  //   fetch("http://localhost:8080/user/123")
  //     .then((res) => res.json())
  //     .then((data) => setUserProfile(data))
  //     .catch(() => setUserProfile(null));
  // }, []);

  async function handleRun() {
    if (!selectedProblem) return;
    setIsRunning(true);
    setResults([]);
    try {
      const firstTestCase = selectedProblem.testcases;
      console.log(selectedProblem);
    const testCases = [{
      input: firstTestCase.input,
      output: firstTestCase.output
    }];
      const res = await fetch('http://localhost:8080/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          testCases: selectedProblem.testcases.map(ex => ({ input: ex.input, expectedOutput: ex.output }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      } else {
        setResults([{ input: '', output: '', expectedOutput: '', passed: false, error: data.error }]);
      }
    } catch (err) {
      setResults([{ input: '', output: '', expectedOutput: '', passed: false, error: '⚠️ Error connecting to backend' }]);
    }
    setIsRunning(false);
  }

  async function handleSubmit() {
    if (!selectedProblem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/submits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: selectedProblem.id, code, language })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        
        if (data.allPassed) {
          alert(`🎉 Accepted!\n\nAll ${data.totalTests} test cases passed!`);
        } else {
          alert(`❌ ${data.status}\n\n${data.passedTests}/${data.totalTests} test cases passed`);
        }
      } else {
        setResults([{ 
          input: '', 
          output: '', 
          expectedOutput: '', 
          passed: false, 
          error: data.error 
        }]);
      }
    } catch (err) {
      console.error('Error submitting:', err);
      setResults([{ 
        input: '', 
        output: '', 
        expectedOutput: '', 
        passed: false, 
        error: '⚠️ Error connecting to backend: ' + err.message 
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }

  const editorRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleRun();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, language, stdin, selectedProblem]);

  const filtered = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.join(" ").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center">Loading problems...</div>;
  if (!selectedProblem) return <div className="p-10 text-center">No problem selected</div>;

  return (
     <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-center text-blue-600">💻 CodeArena</h2>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/3 bg-white rounded-xl shadow-md p-4 border border-gray-200">
          

          <div className="mt-4">
            <h4 className="text-md font-semibold text-gray-700">Problem Statement</h4>
            <p className="text-gray-600 text-sm mt-2">{selectedProblem.statement || 'Loading problem...'}</p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold text-gray-700">Constraints</h4>
            <p className="text-gray-500 text-sm">{selectedProblem.constraints}</p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold text-gray-700">Examples</h4>
            <div className="space-y-2 text-sm">
              {selectedProblem.examples.map((ex, idx) => (
                <div key={idx} className="border p-2 rounded-lg bg-gray-50">
                  <p><strong>Input:</strong> {ex.in}</p>
                  <p><strong>Expected:</strong> {ex.out}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Your Code</h3>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            rows={15}
            className="w-full font-mono p-3 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="mt-4 flex justify-between items-center">
            <div>
              <label className="font-semibold text-gray-700 mr-2">Language:</label>
              <select
                value={language}
                onChange={e => {setLanguage(e.target.value)}}
                className="border p-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-400"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>

            <div className="space-x-3">
              <button
                onClick={handleRun}
                disabled={isRunning}
                className={`px-5 py-2 rounded-lg font-semibold text-white ${isRunning ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-lg font-semibold text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Code'}
              </button>
            </div>
          </div>

          <div className="mt-6 bg-gray-900 text-white p-4 rounded-lg font-mono overflow-auto">
            <h4 className="font-semibold mb-2 text-yellow-400">Results:</h4>
            {results.length === 0 ? (
              <p className="text-gray-300">Run your code to see test results here.</p>
            ) : (
              results.map((r, i) => (
                <div key={i} className={`p-2 rounded-md mb-3 ${r.passed ? 'bg-green-700/40' : 'bg-red-700/40'}`}>
                  <p><strong>Input:</strong> {r.input}</p>
                  <p><strong>Output:</strong> {r.output}</p>
                  <p><strong>Expected:</strong> {r.expectedOutput}</p>
                  <p><strong>Verdict:</strong> {r.passed ? '✅ Passed' : '❌ Failed'}</p>
                  {r.error && <p className="text-red-300">Error: {r.error}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* AI Reviewer Toggle Button */}
      {!isAIReviewerOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAIReviewerOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-purple-500/50 transition z-40"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </motion.button>
      )}

      {/* AI Reviewer Component */}
      <AnimatePresence>
        {isAIReviewerOpen && (
          <AIReviewer
            code={code}
            language={language}
            selectedProblem={selectedProblem}
            isVisible={isAIReviewerOpen}
            onClose={() => setIsAIReviewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

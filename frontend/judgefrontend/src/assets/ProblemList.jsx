import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:8080/api/problems')
      .then((res) => res.json())
      .then((data) => setProblems(data))
      .catch((err) => console.error('Error fetching problems:', err));
  }, []);

  const handleOpenProblem = (slug) => {
    navigate(`/codearena/${slug}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Problems</h2>
      <ul className="space-y-3">
        {problems.map((p) => (
          <li
            key={p.slug}
            className="cursor-pointer p-4 border rounded-xl shadow hover:bg-gray-100 flex items-center justify-between"
            onClick={() => handleOpenProblem(p.id)}
          >
            <span className="font-medium">{p.title}</span>
            <span
              className={`px-2 py-1 text-sm rounded-full ${
                p.difficulty === 'Easy'
                  ? 'bg-green-200 text-green-700'
                  : p.difficulty === 'Medium'
                  ? 'bg-yellow-200 text-yellow-700'
                  : 'bg-red-200 text-red-700'
              }`}
            >
              {p.difficulty}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

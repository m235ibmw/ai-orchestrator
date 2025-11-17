'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/zenn.md')
      .then(res => res.text())
      .then(text => setMarkdown(text));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Large COPY Button */}
        <div className="sticky top-4 z-10 mb-8">
          <button
            onClick={handleCopy}
            className={`w-full py-8 text-4xl font-bold rounded-lg shadow-lg transition-all duration-200 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600 active:scale-95'
            }`}
          >
            {copied ? '✓ コピーしました！' : 'COPY'}
          </button>
          <p className="text-gray-400 text-center mt-3 text-sm">
            下記がコピーされます
          </p>
        </div>

        {/* Markdown Content */}
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { scanEntity } from "@/app/actions";

export function ScanForm() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Client-side validation before hitting the server
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    // Basic URL format check
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith("http")) {
        setError("URL must start with http:// or https://");
        return;
      }
    } catch {
      setError("Invalid URL format. Include https:// at the start");
      return;
    }

    setIsScanning(true);

    try {
      const scanResult = await scanEntity(url);
      
      if (scanResult.error) {
        setError(scanResult.error);
      } else {
        setResult(scanResult);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-slate-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
            Enter your startup or product URL
          </label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={isScanning}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isScanning}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {isScanning ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scanning AI models...
            </span>
          ) : (
            "Scan for Hallucinations"
          )}
        </button>
      </form>

      {result && (
        <div className="mt-8 pt-8 border-t border-slate-700">
          <ScanResults data={result} />
        </div>
      )}
    </div>
  );
}

function ScanResults({ data }: { data: any }) {
  const statusConfig = {
    ACCURATE: {
      bg: "bg-green-900/30",
      text: "text-green-300",
      border: "border-green-500/50",
      icon: "✓",
    },
    UNCERTAIN: {
      bg: "bg-yellow-900/30",
      text: "text-yellow-300",
      border: "border-yellow-500/50",
      icon: "⚠",
    },
    HALLUCINATING: {
      bg: "bg-red-900/30",
      text: "text-red-300",
      border: "border-red-500/50",
      icon: "✗",
    },
  };

  const config = statusConfig[data.status as keyof typeof statusConfig] || statusConfig.UNCERTAIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Scan Results</h2>
        <div className="text-sm text-slate-400">
          Confidence: {data.confidence || 0}%
        </div>
      </div>

      <div className={`${config.bg} border ${config.border} rounded-lg p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-3xl ${config.text}`}>{config.icon}</span>
          <div>
            <h3 className={`text-xl font-semibold ${config.text}`}>
              {data.status}
            </h3>
            <p className="text-slate-300 text-sm mt-1">
              {data.status === "ACCURATE" &&
                "AI models have accurate information about your brand"}
              {data.status === "UNCERTAIN" &&
                "AI models have incomplete or questionable information"}
              {data.status === "HALLUCINATING" &&
                "AI models are generating incorrect information about your brand"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Detected Issues:</h4>
          {data.issues?.map((issue: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <span className={`${config.text} mt-0.5`}>•</span>
              <span className="text-slate-300 text-sm">{issue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">
            Company Name Detected
          </h3>
          <p className="text-white">{data.companyName}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">
            Ground Truth (Your Website)
          </h3>
          <p className="text-white">{data.groundTruth?.tagline}</p>
          {data.groundTruth?.pricing && (
            <p className="text-green-300 text-sm mt-2">
              Pricing detected: {data.groundTruth.pricing}
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">
            What AI Actually Says
          </h3>
          <p className="text-white">{data.aiResponse}</p>
        </div>

        {data.aiPricingResponse && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              AI Pricing Knowledge
            </h3>
            <p className="text-white">{data.aiPricingResponse}</p>
          </div>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">
          Fix AI Hallucinations
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          Join the VEC waitlist to access automated tools that inject verifiable
          truth into AI knowledge graphs and prevent future hallucinations.
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200">
          Join Waitlist
        </button>
      </div>
    </div>
  );
}
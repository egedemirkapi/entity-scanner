import { ScanForm } from "@/components/ScanForm";
import { ScanResults } from "@/components/ScanResults";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Entity Scanner
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            Discover if AI models are hallucinating about your brand
          </p>
          <p className="text-sm text-slate-400">
            We scan your website and compare it against what ChatGPT, Claude, and Gemini actually say
          </p>
        </div>

        {/* Main Form Component */}
        <ScanForm />

        {/* Trust Indicators */}
        <div className="mt-16 text-center text-slate-400 text-sm">
          <p>Powered by Google Gemini • Scans completed in under 10 seconds</p>
          <p className="mt-2">No data stored • No signup required</p>
        </div>
      </div>
    </main>
  );
}
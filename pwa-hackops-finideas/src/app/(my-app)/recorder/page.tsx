import AudioRecorder from "@/components/AudioRecorder";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "Voice Recorder | Finideas Connect",
  description: "Record and transcribe audio notes offline-first",
};

export default function RecorderPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              Voice Recorder
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Record audio notes offline. They&apos;ll be transcribed by AI when you&apos;re
              back online.
            </p>
          </div>
          <AudioRecorder />
        </div>
      </main>
    </>
  );
}

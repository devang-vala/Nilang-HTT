"use client";

import UploadCard from "@/components/UploadCard";
import LeadList from "@/components/LeadList";

export default function HomePage() {
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Business Card Scanner
        </h1>
        <p className="text-gray-600 mb-6">
          Upload business cards and extract text using OCR technology
        </p>

        <UploadCard />
        <LeadList />
      </div>
    </div>
  );
}

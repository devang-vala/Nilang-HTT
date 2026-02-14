import Navbar from '@/components/navbar'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to HackOps</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your hackathon management platform built with Next.js, Payload CMS,
            and TanStack Query.
          </p>
        </div>
      </main>
    </div>
  )
}
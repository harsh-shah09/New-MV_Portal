import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="space-y-4">
        <h1 className="text-9xl font-extrabold text-gray-200">404</h1>
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Page not found</h2>
        <p className="mx-auto max-w-xl text-lg text-gray-600">
          Sorry, we couldn’t find the page you’re looking for. It might have been moved or doesn't exist.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 transition-colors"
          >
            Go back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

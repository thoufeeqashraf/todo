import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          ToDo App
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Multi-tenant task management for businesses across industries
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-gray-700 font-medium rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          >
            Operator Login
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Multi-Tenant
            </h3>
            <p className="text-gray-600 text-sm">
              Complete isolation between companies with secure data separation
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Industry-Specific
            </h3>
            <p className="text-gray-600 text-sm">
              Pre-configured modules for 13+ industries including restaurant, retail, and healthcare
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Flexible Modules
            </h3>
            <p className="text-gray-600 text-sm">
              Enable or disable modules based on your business needs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

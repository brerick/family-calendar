export default function DashboardLoading() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 p-4 sm:p-6 animate-pulse">
      {/* Toolbar skeleton */}
      <div className="h-8 w-48 bg-gray-200 rounded mb-4" />

      {/* Calendar skeleton */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {/* Header row */}
        <div className="flex gap-2 p-4 border-b border-gray-100">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="flex-1" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
        </div>

        {/* Day-name row */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 m-1 bg-gray-100 rounded" />
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-white min-h-[80px] p-1">
              <div className="h-5 w-5 bg-gray-100 rounded mb-1" />
              {i % 5 === 0 && <div className="h-4 w-3/4 bg-blue-100 rounded mb-1" />}
              {i % 7 === 2 && <div className="h-4 w-2/3 bg-green-100 rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

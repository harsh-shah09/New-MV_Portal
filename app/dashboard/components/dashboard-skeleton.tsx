export function DashboardSkeleton() {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Skeleton */}
          <div className="mb-10 animate-pulse">
            <div className="h-10 w-64 bg-slate-200 rounded-lg mb-3"></div>
            <div className="h-6 w-96 bg-slate-200 rounded-lg"></div>
          </div>
  
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card h-40 rounded-2xl p-6 bg-white/60 border border-white/60 shadow-sm animate-pulse relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 w-full">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <div className="h-8 w-32 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-slate-200"></div>
                </div>
                <div className="absolute bottom-6 left-6 h-5 w-28 bg-slate-200 rounded-full"></div>
              </div>
            ))}
          </div>
  
          {/* Charts Section Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="glass-card h-96 bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col">
                <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
                <div className="flex-1 bg-slate-100 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
  
          {/* Recent Activities and Stats Overview Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Recent Activities */}
            <div className="lg:col-span-1 glass-card h-[500px] bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col">
               <div className="flex justify-between items-center mb-6">
                 <div className="h-6 w-32 bg-slate-200 rounded"></div>
                 <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
               </div>
               <div className="space-y-6 flex-1">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex gap-4">
                     <div className="h-10 w-10 rounded-full bg-slate-200 flex-shrink-0"></div>
                     <div className="space-y-2 flex-1 pt-1">
                       <div className="h-4 w-full bg-slate-200 rounded"></div>
                       <div className="h-3 w-20 bg-slate-200 rounded"></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
  
            {/* Stats Overview/Leave Trends */}
            <div className="lg:col-span-2 glass-card h-[500px] bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col">
               <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-full bg-slate-100/50 rounded-xl p-4 border border-slate-100">
                          <div className="h-5 w-32 bg-slate-200 rounded mb-4"></div>
                          <div className="space-y-4">
                              {[...Array(4)].map((_, j) => (
                                  <div key={j} className="flex justify-between">
                                      <div className="h-4 w-24 bg-slate-200 rounded"></div>
                                      <div className="h-4 w-12 bg-slate-200 rounded"></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          </div>
  
          {/* Quick Actions Skeleton */}
          <div className="glass-card rounded-2xl p-6 mt-8 bg-white/60 border border-white/60 shadow-lg animate-pulse">
            <div className="h-6 w-40 bg-slate-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-slate-100 border border-slate-200"></div>
              ))}
            </div>
          </div>
  
        </div>
      </div>
    )
  }

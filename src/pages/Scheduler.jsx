import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, DollarSign } from 'lucide-react'

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const JOB_COLORS = [
  'bg-blue-400',  'bg-purple-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-pink-400',  'bg-indigo-400', 'bg-teal-400',    'bg-rose-400',
]

function parseLocalDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// For each job, build a set of date keys the job spans
function jobDateKeys(job) {
  const start  = parseLocalDate(job.jobData?.startDate)
  const target = parseLocalDate(job.jobData?.targetDate)
  if (!start) return new Set()
  const keys = new Set()
  const end = target || start
  const cur = new Date(start)
  while (cur <= end) {
    keys.add(toKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

export default function Scheduler() {
  const proposals  = useStore(s => s.proposals)
  const navigate   = useNavigate()
  const today      = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null) // date key string

  const wonJobs = proposals
    .filter(p => p.status === 'Won' && (p.jobData?.startDate || p.jobData?.targetDate))
    .filter(p => !(p.jobData?.completedStages || []).includes('closed'))

  // Assign a stable color index per job
  const colorMap = {}
  wonJobs.forEach((j, i) => { colorMap[j.id] = JOB_COLORS[i % JOB_COLORS.length] })

  // Build lookup: dateKey → [job, ...]
  const dayJobs = {}
  wonJobs.forEach(job => {
    jobDateKeys(job).forEach(key => {
      if (!dayJobs[key]) dayJobs[key] = []
      dayJobs[key].push(job)
    })
  })

  const cells   = buildCalendar(year, month)
  const todayKey = toKey(today)

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedJobs = selected ? (dayJobs[selected] || []) : []

  // Jobs with no dates — show in sidebar
  const noDateJobs = proposals.filter(p =>
    p.status === 'Won' &&
    !(p.jobData?.completedStages || []).includes('closed') &&
    !p.jobData?.startDate && !p.jobData?.targetDate
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Scheduler</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Set start &amp; target dates in Job Management to plot jobs here
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Calendar */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-800">{MONTH_NAMES[month]} {year}</p>
              <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
                className="text-xs text-blue-600 hover:underline">Today</button>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="min-h-[64px] bg-gray-50/50 border-r border-b border-gray-50" />
              const key       = toKey(date)
              const jobs      = dayJobs[key] || []
              const isToday   = key === todayKey
              const isSelected= key === selected
              return (
                <div
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`min-h-[64px] p-1 border-r border-b border-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : isToday ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-500'
                  }`}>
                    {date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {jobs.slice(0, 2).map(job => (
                      <div key={job.id}
                        className={`text-white text-[9px] font-medium px-1 py-0.5 rounded truncate ${colorMap[job.id]}`}>
                        {job.client.split(' ')[0]}
                      </div>
                    ))}
                    {jobs.length > 2 && (
                      <p className="text-[9px] text-gray-400 pl-0.5">+{jobs.length - 2}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selected && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              {selectedJobs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No jobs scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {selectedJobs.map(job => (
                    <div key={job.id}
                      onClick={() => navigate('/jobs')}
                      className="cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors">
                      <div className={`w-full h-1 rounded-full mb-1.5 ${colorMap[job.id]}`} />
                      <p className="text-sm font-semibold text-gray-900">{job.client}</p>
                      {job.address && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {job.address}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <DollarSign size={10} /> ${fmt(job.total)}
                      </p>
                      {job.jobData?.startDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {job.jobData.startDate} → {job.jobData.targetDate || '?'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Jobs with no dates */}
          {noDateJobs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">No dates set ({noDateJobs.length})</p>
              <div className="space-y-2">
                {noDateJobs.map(job => (
                  <div key={job.id} onClick={() => navigate('/jobs')}
                    className="cursor-pointer">
                    <p className="text-xs font-medium text-gray-800 hover:text-blue-600 transition-colors">{job.client}</p>
                    <p className="text-xs text-gray-400">${fmt(job.total)}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/jobs')}
                className="mt-2 text-xs text-amber-700 hover:underline font-medium">
                Add dates in Job Management →
              </button>
            </div>
          )}

          {/* Legend */}
          {wonJobs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Active Jobs</p>
              <div className="space-y-2">
                {wonJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[job.id]}`} />
                    <span className="text-xs text-gray-700 truncate">{job.client}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wonJobs.length === 0 && !noDateJobs.length && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <CalendarDays size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No active jobs with dates yet.</p>
              <button onClick={() => navigate('/jobs')}
                className="mt-2 text-xs text-blue-600 hover:underline">
                Go to Job Management →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

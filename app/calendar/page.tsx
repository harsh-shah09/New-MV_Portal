"use client"

import { useState, useEffect } from "react"
import { Calendar, Badge, Card, List, Tag, Spin, Modal } from "antd"
import type { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { MainNav } from "@/components/main-nav"
import type { CalendarEvent } from "@/types"

// Dummy API simulation
const fetchEvents = async (): Promise<CalendarEvent[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "1",
          title: "New Year",
          startDate: "2025-01-01",
          endDate: "2025-01-01",
          eventType: "holiday",
        },
        {
          id: "2",
          title: "Team Meeting",
          startDate: dayjs().format("YYYY-MM-DD"), // Today
          endDate: dayjs().format("YYYY-MM-DD"),
          eventType: "meeting",
          description: "Monthly sync up",
        },
        {
          id: "3",
          title: "React Training",
          startDate: dayjs().add(2, 'day').format("YYYY-MM-DD"),
          endDate: dayjs().add(2, 'day').format("YYYY-MM-DD"),
          eventType: "training",
        },
        {
          id: "4",
          title: "John Doe Leave",
          startDate: dayjs().add(5, 'day').format("YYYY-MM-DD"),
          endDate: dayjs().add(5, 'day').format("YYYY-MM-DD"),
          eventType: "leave",
        },
        {
          id: "3",
          title: "Project Deadline",
          startDate: dayjs().add(10, 'day').format("YYYY-MM-DD"),
          endDate: dayjs().add(10, 'day').format("YYYY-MM-DD"),
          eventType: "deadline",
        },
      ])
    }, 800)
  })
}

const getListData = (value: Dayjs, events: CalendarEvent[]) => {
  const dateStr = value.format("YYYY-MM-DD")
  return events.filter(event => event.startDate === dateStr || (event.endDate >= dateStr && event.startDate <= dateStr));
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    fetchEvents().then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setSelectedEvents(getListData(selectedDate, events))
  }, [events, selectedDate])

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value, events)
    return (
      <ul className="events list-none p-0 m-0">
        {listData.map((item) => (
          <li key={item.id} className="mb-1">
             <Badge 
               status={
                 item.eventType === 'holiday' ? 'success' : 
                 item.eventType === 'leave' ? 'warning' : 
                 item.eventType === 'deadline' ? 'error' : 
                 item.eventType === 'training' ? 'processing' : 'default'
               } 
               text={<span className="text-xs">{item.title}</span>} 
              />
          </li>
        ))}
      </ul>
    )
  }

  const onSelect = (newValue: Dayjs) => {
    setSelectedDate(newValue)
    setSelectedEvents(getListData(newValue, events))
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Holiday & Event Calendar</h1>
            <p className="text-slate-500 text-lg">View holidays, leaves, and upcoming company events.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3">
             <Card className="shadow-sm rounded-xl border-slate-200" bordered={false}>
                {loading ? (
                  <div className="flex justify-center items-center h-96">
                    <Spin size="large" />
                  </div>
                ) : (
                  <Calendar 
                    cellRender={dateCellRender} 
                    onSelect={onSelect} 
                    className="custom-calendar"
                  />
                )}
             </Card>
           </div>
           
           <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
               <h3 className="text-lg font-bold text-gray-800 mb-4">{selectedDate.format("MMMM D, YYYY")}</h3>
               
               {selectedEvents.length === 0 ? (
                 <p className="text-gray-400 italic">No events for this day.</p>
               ) : (
                 <List
                    itemLayout="horizontal"
                    dataSource={selectedEvents}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <div className="flex items-center justify-between">
                              <span>{item.title}</span>
                              <Tag color={
                                 item.eventType === 'holiday' ? 'green' : 
                                 item.eventType === 'leave' ? 'gold' : 
                                 item.eventType === 'deadline' ? 'red' : 
                                 item.eventType === 'training' ? 'blue' : 'default'
                              }>
                                {item.eventType}
                              </Tag>
                            </div>
                          }
                          description={item.description || "All day event"}
                        />
                      </List.Item>
                    )}
                 />
               )}

               <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm"><Badge status="success" /> Holiday</div>
                    <div className="flex items-center gap-2 text-sm"><Badge status="processing" /> Training</div>
                    <div className="flex items-center gap-2 text-sm"><Badge status="warning" /> Leave</div>
                    <div className="flex items-center gap-2 text-sm"><Badge status="error" /> Deadline</div>
                    <div className="flex items-center gap-2 text-sm"><Badge status="default" /> Meeting</div>
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-calendar .ant-picker-calendar-date-content {
           height: 80px;
           overflow: hidden;
        }
      `}</style>
    </div>
  )
}

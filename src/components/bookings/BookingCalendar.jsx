import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, startOfWeek, startOfToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const timeSlots = Array.from({ length: 19 }, (_, i) => {
  const hour = 10 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export default function BookingCalendar({ bookings, onEditBooking, onNewBooking, onDeleteBooking, onEditCustomer }) {
  const [currentDate, setCurrentDate] = useState(startOfToday());

  const startDay = currentDate;

  const previousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };
  
  const getBookingForSlot = (date, time) => {
    return bookings.find(b => b.date === date && b.time === time && !b.isDelivery);
  };

  const getDeliveryBookingsForDate = (date) => {
    return bookings.filter(b => b.date === date && b.isDelivery);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          {format(startDay, 'yyyy년 M월')}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={previousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[auto_repeat(7,minmax(120px,1fr))]">
          {/* Time column */}
          <div className="text-sm font-semibold text-gray-600 sticky left-0 bg-white z-10">
            <div className="h-14 border-r border-b flex items-center justify-center"></div> {/* Header alignment */}
            {/* Delivery area placeholder for time column - 항상 표시 */}
            <div className="border-r border-b h-[60px] bg-gray-50"></div>
            {timeSlots.map((time) => (
              <div 
                key={time} 
                className="h-16 flex items-center justify-center border-t border-r pr-2"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const day = addDays(startDay, dayIndex);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const deliveryBookings = getDeliveryBookingsForDate(dateStr);
            
            return (
              <div key={dayIndex} className={cn(isToday && "border-2 border-blue-500 rounded-lg")}>
                <div className={cn(
                    "text-center py-2 h-14 border-b",
                    isToday ? 'text-blue-600 font-bold' : ''
                )}>
                  <p>{format(day, 'd')}</p>
                  <p className="text-xs">{format(day, 'EEE', { locale: ko })}</p>
                </div>
                {/* 출고 예정일 영역 - 날짜 바로 아래 */}
                <div className="border-b border-r h-[60px] p-2 bg-red-50 overflow-y-auto">
                  {deliveryBookings.length > 0 ? (
                    <div className="space-y-1">
                      {deliveryBookings.map(delivery => (
                        <div
                          key={delivery.id}
                          onClick={async () => {
                            if (onEditCustomer && delivery.customerId) {
                              const { supabase } = await import('@/lib/firebase');
                              try {
                                const { data: customer, error } = await supabase
                                  .from('customers')
                                  .select('*')
                                  .eq('id', delivery.customerId)
                                  .single();
                                if (error) throw error;
                                if (customer) {
                                  onEditCustomer(customer);
                                }
                              } catch (err) {
                                console.error('고객 정보 로딩 실패:', err);
                              }
                            }
                          }}
                          className="bg-red-100 border border-red-300 rounded p-1.5 text-xs cursor-pointer hover:bg-red-200 transition-colors"
                        >
                          <p className="font-semibold text-red-700 truncate">{delivery.notes || `${delivery.customerName}님의 출고예정일`}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {/* 시간 슬롯 영역 */}
                <div>
                  {timeSlots.map(time => {
                    const booking = getBookingForSlot(dateStr, time);
                    return (
                      <div key={time} className="h-16 border-t border-r p-1 relative group">
                        {booking ? (
                          <div
                            onClick={() => onEditBooking(booking)}
                            className="bg-blue-100 text-blue-800 rounded-lg p-2 text-xs h-full flex flex-col justify-between cursor-pointer relative"
                          >
                            <div>
                              <p className="font-bold truncate">{booking.customerName}</p>
                              <p className="truncate">{booking.phone}</p>
                              <p className="truncate">{booking.type}</p>
                            </div>
                            {onDeleteBooking && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('이 예약을 삭제하시겠습니까?')) {
                                    onDeleteBooking(booking.id);
                                  }
                                }}
                                className="absolute top-1 right-1 p-1 rounded hover:bg-red-100 text-red-500"
                                aria-label="예약 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => onNewBooking(dateStr, time)}
                            className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Plus className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
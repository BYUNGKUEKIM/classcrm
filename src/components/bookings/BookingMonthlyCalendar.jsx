import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

export const BookingMonthlyCalendar = ({ bookings = [], onEditBooking, onNewBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 현재 월의 시작과 끝
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // 달력에 표시할 날짜들 (이전/다음 달 포함)
  const calendarDays = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay()); // 일요일로 시작

    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay())); // 토요일로 끝

    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // 날짜별 예약 그룹화
  const bookingsByDate = useMemo(() => {
    const grouped = {};
    bookings.forEach(booking => {
      const dateKey = format(new Date(booking.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    return grouped;
  }, [bookings]);

  // 이전/다음 달로 이동
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    if (onNewBooking) {
      onNewBooking(format(date, 'yyyy-MM-dd'), '09:00');
    }
  };

  // 예약 클릭 핸들러
  const handleBookingClick = (e, booking) => {
    e.stopPropagation();
    if (onEditBooking) {
      onEditBooking(booking);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              오늘
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* 요일 헤더 */}
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div
              key={day}
              className={`p-2 text-center text-sm font-semibold ${
                index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}

          {/* 날짜 그리드 */}
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayBookings = bookingsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const dayOfWeek = day.getDay();

            return (
              <div
                key={index}
                className={`min-h-[120px] border rounded-lg p-2 cursor-pointer transition-colors ${
                  !isCurrentMonth
                    ? 'bg-gray-50 text-gray-400'
                    : isTodayDate
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleDateClick(day)}
              >
                {/* 날짜 숫자 */}
                <div
                  className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth
                      ? 'text-gray-400'
                      : dayOfWeek === 0
                      ? 'text-red-600'
                      : dayOfWeek === 6
                      ? 'text-blue-600'
                      : 'text-gray-900'
                  } ${isTodayDate ? 'font-bold' : ''}`}
                >
                  {format(day, 'd')}
                </div>

                {/* 예약 목록 */}
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking, idx) => (
                    <div
                      key={idx}
                      className="text-xs p-1 bg-primary/10 hover:bg-primary/20 rounded cursor-pointer truncate"
                      onClick={(e) => handleBookingClick(e, booking)}
                      title={`${booking.time} - ${booking.customerName} (${booking.type})`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{booking.time}</span>
                        <span className="truncate">{booking.customerName}</span>
                      </div>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayBookings.length - 3}개 더보기
                    </div>
                  )}
                </div>

                {/* 빈 날짜에 + 버튼 */}
                {isCurrentMonth && dayBookings.length === 0 && (
                  <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-500 rounded"></div>
            <span>오늘</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 rounded"></div>
            <span>예약 있음</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingMonthlyCalendar;

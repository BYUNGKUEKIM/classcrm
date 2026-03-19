import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function BookingList({ bookings, onEdit, onDelete }) {
  const { toast } = useToast();

  const handleDelete = (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(id);
      toast({
        title: "예약 삭제 완료",
        description: "예약이 삭제되었습니다.",
      });
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      {sortedBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg">예약이 없습니다</p>
        </div>
      ) : (
        sortedBookings.map((booking, index) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{booking.customerName}</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {booking.date}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {booking.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {booking.phone}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {booking.type}
                  </span>
                </div>
                {booking.notes && (
                  <p className="mt-3 text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    {booking.notes}
                  </p>
                )}
              </div>
              <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(booking)}
                  className="flex-1 md:flex-none"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(booking.id)}
                  className="flex-1 md:flex-none text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
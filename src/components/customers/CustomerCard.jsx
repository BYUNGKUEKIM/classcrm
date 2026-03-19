import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomerCard({ customer, index, onEdit, onDelete }) {

  const handleDelete = () => {
    onDelete(customer.id);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col border border-gray-100"
    >
      <div className="flex-grow">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-base">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base truncate" title={customer.name}>{customer.name}</h3>
            {customer.type && (
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {customer.type}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          {customer.phone && (
            <div className="flex items-center">
              <Phone className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <a href={`tel:${customer.phone}`} className="hover:text-blue-600 truncate" title={customer.phone}>{customer.phone}</a>
            </div>
          )}
          {customer.email && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = `https://mail.naver.com/write/popup?to=${encodeURIComponent(customer.email)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center hover:text-blue-600 group cursor-pointer"
            >
              <Mail className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate text-left" title={customer.email}>{customer.email}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(customer)}
          className="flex-1 h-8 text-xs"
        >
          <Edit className="w-3 h-3 mr-1" />
          수정
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="flex-1 h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 hover:border-red-300"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          삭제
        </Button>
      </div>
    </motion.div>
  );
}
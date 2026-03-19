import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function PhotoGrid({ photos, onDelete }) {
  const { toast } = useToast();

  const handleDelete = (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(id);
      toast({
        title: "사진 삭제 완료",
        description: "사진이 삭제되었습니다.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
        >
          <div className="relative aspect-square overflow-hidden">
            <img
              src={photo.imageUrl}
              alt={photo.description || photo.customerName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(photo.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              <p className="font-medium text-gray-900">{photo.customerName}</p>
            </div>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {photo.category}
            </span>
            {photo.description && (
              <p className="text-sm text-gray-600 mt-2">{photo.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
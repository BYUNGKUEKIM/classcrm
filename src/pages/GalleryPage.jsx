import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhotoDialog from '@/components/gallery/PhotoDialog';
import PhotoGrid from '@/components/gallery/PhotoGrid';

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = () => {
    const stored = JSON.parse(localStorage.getItem('photos') || '[]');
    setPhotos(stored);
  };

  const handleSavePhoto = (photoData) => {
    const stored = JSON.parse(localStorage.getItem('photos') || '[]');
    const newPhoto = { ...photoData, id: Date.now().toString(), createdAt: new Date().toISOString() };
    stored.push(newPhoto);
    localStorage.setItem('photos', JSON.stringify(stored));
    
    loadPhotos();
    setIsDialogOpen(false);
  };

  const handleDeletePhoto = (id) => {
    const stored = JSON.parse(localStorage.getItem('photos') || '[]');
    const filtered = stored.filter(p => p.id !== id);
    localStorage.setItem('photos', JSON.stringify(filtered));
    loadPhotos();
  };

  const filteredPhotos = photos.filter(photo =>
    photo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <Helmet>
        <title>갤러리 - 포토스튜디오 CRM</title>
        <meta name="description" content="고객 사진 갤러리 관리" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">갤러리</h1>
            <p className="text-gray-600 mt-2">총 {photos.length}장의 사진</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            사진 추가
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="고객명, 카테고리로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        <PhotoGrid
          photos={filteredPhotos}
          onDelete={handleDeletePhoto}
        />

        {filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">사진이 없습니다</p>
          </div>
        )}
      </div>

      <PhotoDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSavePhoto}
      />
    </Layout>
  );
}
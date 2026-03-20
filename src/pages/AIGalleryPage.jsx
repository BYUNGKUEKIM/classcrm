import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Upload, Search, Filter, Star, Download, 
  Eye, Trash2, Tag, Users, Sparkles, Grid, List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import aiPhotoService from '@/lib/aiPhotoService';
import { useToast } from '@/components/ui/use-toast';

export default function AIGalleryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mock data - 실제로는 Firebase에서 가져옴
  useEffect(() => {
    if (user) {
      loadPhotos();
    }
  }, [user]);

  const loadPhotos = async () => {
    // TODO: Firebase에서 사진 로드
    const mockPhotos = [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
        customerName: '김철수',
        shootingDate: '2026-03-15',
        tags: ['가족사진', '스튜디오', '정장'],
        quality: 0.95,
        faces: 4,
        selected: false,
        analyzed: true
      },
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400',
        customerName: '이영희',
        shootingDate: '2026-03-14',
        tags: ['프로필', '실내', '캐주얼'],
        quality: 0.88,
        faces: 1,
        selected: false,
        analyzed: true
      }
    ];
    setPhotos(mockPhotos);
    setFilteredPhotos(mockPhotos);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredPhotos(photos);
      return;
    }

    try {
      const results = await aiPhotoService.searchPhotos(user.uid, query);
      setFilteredPhotos(results);
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search
      const filtered = photos.filter(photo =>
        photo.customerName.includes(query) ||
        photo.tags.some(tag => tag.includes(query))
      );
      setFilteredPhotos(filtered);
    }
  };

  const handleBatchAnalyze = async () => {
    if (selectedPhotos.length === 0) {
      toast({
        title: '사진을 선택하세요',
        description: '분석할 사진을 먼저 선택해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setAnalyzing(true);
    try {
      const photoUrls = selectedPhotos.map(id => 
        photos.find(p => p.id === id)?.url
      ).filter(Boolean);

      const results = await aiPhotoService.batchAnalyzePhotos(user.uid, photoUrls);
      
      toast({
        title: '분석 완료!',
        description: `${results.length}개의 사진이 분석되었습니다.`
      });

      // 결과 반영
      const updatedPhotos = photos.map(photo => {
        const result = results.find(r => r.photoUrl === photo.url);
        if (result) {
          return {
            ...photo,
            quality: result.quality?.overall || photo.quality,
            tags: result.tags?.tags.map(t => t.label) || photo.tags,
            analyzed: true
          };
        }
        return photo;
      });

      setPhotos(updatedPhotos);
      setFilteredPhotos(updatedPhotos);
      setSelectedPhotos([]);
    } catch (error) {
      console.error('Batch analyze error:', error);
      toast({
        title: '분석 실패',
        description: '사진 분석 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const PhotoCard = ({ photo }) => (
    <Card 
      className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
        selectedPhotos.includes(photo.id) ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => togglePhotoSelection(photo.id)}
    >
      <div className="relative">
        <img 
          src={photo.url} 
          alt={photo.customerName}
          className="w-full h-48 object-cover"
        />
        {selectedPhotos.includes(photo.id) && (
          <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
            <Star className="h-4 w-4 text-white fill-white" />
          </div>
        )}
        {photo.analyzed && (
          <Badge className="absolute bottom-2 left-2 bg-green-500">
            <Sparkles className="h-3 w-3 mr-1" />
            분석 완료
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{photo.customerName}</h3>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-4 w-4 fill-yellow-500" />
            <span className="text-sm">{(photo.quality * 5).toFixed(1)}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2">{photo.shootingDate}</p>
        <div className="flex flex-wrap gap-1">
          {photo.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {photo.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{photo.tags.length - 3}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>{photo.faces}명</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>AI 갤러리 - 포토스튜디오 CRM</title>
        <meta name="description" content="AI 기반 스마트 사진 관리" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-500" />
              AI 스마트 갤러리
            </h1>
            <p className="text-gray-600 mt-2">AI 기반 사진 분석 및 관리</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              사진 업로드
            </Button>
            <Button 
              onClick={handleBatchAnalyze}
              disabled={selectedPhotos.length === 0 || analyzing}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {analyzing ? (
                <>분석 중...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 분석 ({selectedPhotos.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="고객명, 태그로 검색... (예: 가족사진, 김철수)"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">전체 사진</div>
              <div className="text-2xl font-bold">{photos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">선택됨</div>
              <div className="text-2xl font-bold text-blue-500">{selectedPhotos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">분석 완료</div>
              <div className="text-2xl font-bold text-green-500">
                {photos.filter(p => p.analyzed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">평균 품질</div>
              <div className="text-2xl font-bold text-yellow-500">
                {photos.length > 0
                  ? ((photos.reduce((sum, p) => sum + p.quality, 0) / photos.length) * 5).toFixed(1)
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">전체 ({photos.length})</TabsTrigger>
            <TabsTrigger value="analyzed">분석 완료 ({photos.filter(p => p.analyzed).length})</TabsTrigger>
            <TabsTrigger value="selected">선택됨 ({selectedPhotos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPhotos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPhotos.map((photo) => (
                  <Card key={photo.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 flex gap-4">
                      <img 
                        src={photo.url} 
                        alt={photo.customerName}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{photo.customerName}</h3>
                        <p className="text-sm text-gray-600">{photo.shootingDate}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {photo.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyzed" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPhotos.filter(p => p.analyzed).map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="selected" className="mt-6">
            {selectedPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPhotos.filter(p => selectedPhotos.includes(p.id)).map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">선택된 사진이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

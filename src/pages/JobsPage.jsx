import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react';

export default function JobsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    clientName: '',
    jobType: '',
    shootDate: '',
    shootTime: '',
    location: '',
    status: 'pending',
    price: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const jobsRef = collection(db, 'jobs');
      const q = query(jobsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by shoot date
      jobsData.sort((a, b) => {
        if (!a.shootDate) return 1;
        if (!b.shootDate) return -1;
        return a.shootDate.localeCompare(b.shootDate);
      });
      
      setJobs(jobsData);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...formData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      resetForm();
      loadJobs();
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDelete = async (jobId) => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await deleteDoc(doc(db, 'jobs', jobId));
        loadJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      clientName: job.clientName,
      jobType: job.jobType,
      shootDate: job.shootDate,
      shootTime: job.shootTime,
      location: job.location,
      status: job.status,
      price: job.price,
      notes: job.notes || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      jobType: '',
      shootDate: '',
      shootTime: '',
      location: '',
      status: 'pending',
      price: '',
      notes: ''
    });
    setEditingJob(null);
    setShowAddDialog(false);
  };

  const filteredJobs = jobs.filter(job =>
    job.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jobType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      active: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: AlertCircle,
      confirmed: CheckCircle,
      active: Camera,
      completed: CheckCircle,
      cancelled: AlertCircle
    };
    return icons[status] || AlertCircle;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
              <p className="text-gray-600 mt-1">Manage your photography shoots</p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t("searchJobs")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Add/Edit Dialog */}
        {showAddDialog && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingJob ? 'Edit Job' : 'New Job'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Job Type</label>
                    <Input
                      value={formData.jobType}
                      onChange={(e) => setFormData({...formData, jobType: e.target.value})}
                      placeholder="Wedding, Portrait, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shoot Date</label>
                    <Input
                      type="date"
                      value={formData.shootDate}
                      onChange={(e) => setFormData({...formData, shootDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shoot Time</label>
                    <Input
                      type="time"
                      value={formData.shootTime}
                      onChange={(e) => setFormData({...formData, shootTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Studio, Venue, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="₩"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full h-10 rounded-md border border-gray-300 px-3"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingJob ? 'Update' : 'Create'} Job
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first job</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{job.clientName}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(job.status)}`}>
                            <StatusIcon className="h-3 w-3" />
                            {job.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            {job.jobType}
                          </div>
                          {job.shootDate && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {job.shootDate}
                            </div>
                          )}
                          {job.shootTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {job.shootTime}
                            </div>
                          )}
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                          )}
                        </div>
                        {job.price && (
                          <p className="mt-3 text-sm font-medium text-gray-900">
                            ₩{parseInt(job.price).toLocaleString()}
                          </p>
                        )}
                        {job.notes && (
                          <p className="mt-2 text-sm text-gray-600">{job.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

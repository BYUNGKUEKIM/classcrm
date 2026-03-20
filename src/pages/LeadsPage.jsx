import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  User,
  Trash2,
  Edit,
  CheckCircle
} from 'lucide-react';

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    eventDate: '',
    budget: '',
    status: 'new',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLeads(leadsData);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingLead) {
        // Update existing lead
        await updateDoc(doc(db, 'leads', editingLead.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new lead
        await addDoc(collection(db, 'leads'), {
          ...formData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      resetForm();
      loadLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleDelete = async (leadId) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteDoc(doc(db, 'leads', leadId));
        loadLeads();
      } catch (error) {
        console.error('Error deleting lead:', error);
      }
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      eventType: lead.eventType,
      eventDate: lead.eventDate,
      budget: lead.budget,
      status: lead.status,
      notes: lead.notes || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      eventType: '',
      eventDate: '',
      budget: '',
      status: 'new',
      notes: ''
    });
    setEditingLead(null);
    setShowAddDialog(false);
  };

  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.eventType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-purple-100 text-purple-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.new;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600 mt-1">Manage your photography inquiries</p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lead
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
              placeholder="Search leads..."
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
              <CardTitle>{editingLead ? 'Edit Lead' : 'New Lead'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Event Type</label>
                    <Input
                      value={formData.eventType}
                      onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                      placeholder="Wedding, Portrait, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Event Date</label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget</label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
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
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
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
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingLead ? 'Update' : 'Create'} Lead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Leads List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first lead</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.eventType && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {lead.eventType}
                          </div>
                        )}
                        {lead.budget && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            ₩{parseInt(lead.budget).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="mt-3 text-sm text-gray-600">{lead.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(lead.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

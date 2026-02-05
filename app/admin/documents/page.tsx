'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Modal } from '@/components/ui';
import { DocumentGroup, Document } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  FolderPlus,
  Upload,
  FileText,
  Trash2,
  Copy,
  Check,
  FolderOpen,
  ArrowLeft,
  Download,
} from 'lucide-react';

export default function DocumentsPage() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DocumentGroup | null>(null);
  const [joinGroupId, setJoinGroupId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('document_groups')
      .select('*')
      .order('created_at', { ascending: false });
    setGroups(data || []);
    setIsLoading(false);
  };

  const fetchDocuments = async (groupId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    // Generate a random 6-character group ID
    const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('document_groups')
      .insert({
        group_id: groupId,
        name: newGroupName,
        created_by: profile?.id,
      })
      .select()
      .single();

    if (!error && data) {
      setGroups([data, ...groups]);
      setNewGroupName('');
      setIsCreateModalOpen(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const group = groups.find((g) => g.group_id === joinGroupId.toUpperCase());
    if (group) {
      setSelectedGroup(group);
      fetchDocuments(group.id);
    } else {
      // Try to fetch from database
      const supabase = createClient();
      const { data } = await supabase
        .from('document_groups')
        .select('*')
        .eq('group_id', joinGroupId.toUpperCase())
        .single();

      if (data) {
        setGroups([data, ...groups.filter((g) => g.id !== data.id)]);
        setSelectedGroup(data);
        fetchDocuments(data.id);
      } else {
        alert('Group not found. Check the Group ID.');
      }
    }
    setJoinGroupId('');
  };

  const handleSelectGroup = (group: DocumentGroup) => {
    setSelectedGroup(group);
    fetchDocuments(group.id);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedGroup) return;

    setIsUploading(true);
    const supabase = createClient();

    // Upload file to Supabase Storage
    const fileExt = uploadFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `documents/${selectedGroup.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, uploadFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Failed to upload file. Make sure storage is configured.');
      setIsUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Save document record
    const { data, error } = await supabase
      .from('documents')
      .insert({
        group_id: selectedGroup.id,
        name: uploadFile.name,
        file_url: urlData.publicUrl,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        uploaded_by: profile?.id,
      })
      .select()
      .single();

    if (!error && data) {
      setDocuments([data, ...documents]);
      setUploadFile(null);
      setIsUploadModalOpen(false);
    }

    setIsUploading(false);
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm('Delete this document?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (!error) {
      setDocuments(documents.filter((d) => d.id !== doc.id));
    }
  };

  const handleDeleteGroup = async (group: DocumentGroup) => {
    if (!confirm('Delete this group and all its documents?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('document_groups').delete().eq('id', group.id);

    if (!error) {
      setGroups(groups.filter((g) => g.id !== group.id));
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setDocuments([]);
      }
    }
  };

  const copyGroupId = (groupId: string) => {
    navigator.clipboard.writeText(groupId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  // Document list view
  if (selectedGroup) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedGroup(null)} className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{selectedGroup.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                  {selectedGroup.group_id}
                </code>
                <button
                  onClick={() => copyGroupId(selectedGroup.group_id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)} className="w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No documents yet</p>
                <Button className="mt-4" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 text-gray-400 hover:text-blue-600 active:text-blue-700 rounded-lg"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-2.5 text-gray-400 hover:text-red-600 active:text-red-700 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Document"
        >
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {uploadFile ? uploadFile.name : 'Click to select a file'}
                </p>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!uploadFile} isLoading={isUploading}>
                Upload
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Groups list view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Share documents with your team using Group IDs</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Join Group */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleJoinGroup} className="flex gap-3">
            <Input
              placeholder="Enter Group ID to join..."
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!joinGroupId}>
              Join Group
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No document groups yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a group or join one with a Group ID
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleSelectGroup(group)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-xs text-gray-500">ID: {group.group_id}</p>
                      </div>
                    </div>
                    {isAdminOrManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Created {formatDate(group.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Document Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g., Service Manuals, Training Docs"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <p className="text-sm text-gray-500">
            A unique Group ID will be generated that you can share with others.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Group</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

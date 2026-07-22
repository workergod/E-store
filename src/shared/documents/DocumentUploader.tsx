import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, Eye, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fileUploadService } from '../../services/FileUploadService';
import { documentRepository } from '../../repositories/DocumentRepository';
import type { DocumentRecord, EntityType, DocumentCategory } from '../../shared/types/Document';
import { useAuthStore } from "../../store/authStore";
import { Button } from '../ui/Button';

interface DocumentUploaderProps {
  entityType: EntityType;
  entityId: string;
  category: DocumentCategory;
  onUploadComplete?: () => void;
}

export function DocumentUploader({ entityType, entityId, category, onUploadComplete }: DocumentUploaderProps) {
  const { company, user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!company?.companyId || !entityId) return;
    try {
      setIsLoading(true);
      const docs = await documentRepository.getByEntity(company.companyId, entityType, entityId);
      // Filter by category if we want this component to only show one category, 
      // or we can show all for the entity. Let's filter by category for scoped views.
      setDocuments(docs.filter(d => d.category === category));
    } catch (e) {
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [company, entityType, entityId, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.companyId || !user?.uid) return;

    try {
      setIsUploading(true);
      
      // Determine a documentType (e.g., from extension or ask user. Simple fallback for now)
      let docType = 'Other';
      if (file.type.startsWith('image/')) docType = 'Image';
      else if (file.type === 'application/pdf') docType = 'PDF';

      const path = `${company.companyId}/${entityType.toLowerCase()}/${entityId}/${category.toLowerCase()}`;
      const url = await fileUploadService.upload(file, path);

      await documentRepository.create({
        companyId: company.companyId,
        entityType,
        entityId,
        category,
        documentType: docType,
        fileName: file.name,
        fileUrl: url,
        sizeBytes: file.size,
        mimeType: file.type,
        uploadedBy: user.uid
      }, user.uid);

      toast.success('Document uploaded');
      loadDocuments();
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    if (!company?.companyId || !user?.uid) return;
    if (!window.confirm("Delete this document?")) return;

    try {
      await fileUploadService.delete(fileUrl);
      await documentRepository.delete(docId, company.companyId, user.uid);
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div 
        className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or PDF (max. 10MB)</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          accept="image/*,application/pdf"
        />
        {isUploading && (
          <div className="mt-4 flex items-center text-sm text-primary">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
          </div>
        )}
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FileIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.documentType} • {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fileUploadService.preview(doc.fileUrl); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fileUploadService.download(doc.fileUrl, doc.fileName); }}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id!, doc.fileUrl); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

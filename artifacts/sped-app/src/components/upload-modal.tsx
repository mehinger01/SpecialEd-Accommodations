import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListDocumentsQueryKey, useListStudents } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("IEP");
  const [studentId, setStudentId] = useState<string>("none");
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: students } = useListStudents({}, { query: { enabled: open }});

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      if (studentId !== "none") {
        formData.append("studentId", studentId);
      }
      
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to upload document");
      }
      
      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded and is pending processing.",
      });
      
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      
      setFile(null);
      setDocumentType("IEP");
      setStudentId("none");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload an IEP, 504, or BIP document to extract accommodations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              PDF File
            </Label>
            <div className="col-span-3">
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="docType" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IEP">IEP</SelectItem>
                  <SelectItem value="504">504 Plan</SelectItem>
                  <SelectItem value="BIP">BIP</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              Student
            </Label>
            <div className="col-span-3">
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Unassigned --</SelectItem>
                  {students?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

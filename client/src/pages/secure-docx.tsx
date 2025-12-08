import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Shield, Lock, CheckCircle2, AlertCircle, 
  Download, Trash2, RefreshCw, ArrowLeft, Zap
} from "lucide-react";
import { Link } from "wouter";
import type { SecureDocument } from "@shared/schema";

interface LambdaSignature {
  signature: string;
  wavelength: number;
  frequency: number;
  energyHash: string;
}

function generateLambdaSignature(filename: string, size: number): LambdaSignature {
  const wavelength = 380 + (filename.charCodeAt(0) % 120) + ((size % 300));
  const frequency = (3e8) / (wavelength * 1e-9);
  const planckConstant = 6.62607015e-34;
  const energy = planckConstant * frequency;
  const energyHash = `Λ${energy.toExponential(6)}_${Date.now().toString(36)}`;
  const signature = `WNSP-Λ-${wavelength.toFixed(4)}nm-${frequency.toExponential(4)}Hz`;
  
  return {
    signature,
    wavelength,
    frequency,
    energyHash,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SecureDocxPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: documents, isLoading, error } = useQuery<SecureDocument[]>({
    queryKey: ["/api/secure-documents"],
    queryFn: async () => {
      const res = await fetch("/api/secure-documents");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }
      return data.documents || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData: { filename: string; originalName: string; size: number; objectPath: string }) => {
      const res = await fetch("/api/secure-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileData.filename,
          originalName: fileData.originalName,
          size: fileData.size,
          objectPath: fileData.objectPath,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/secure-documents"] });
      toast({
        title: "Document Secured",
        description: "Your document has been encrypted with a Lambda signature.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Upload Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (docId: string) => {
      setVerifyingId(docId);
      const res = await fetch(`/api/secure-documents/${docId}/verify`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setVerifyingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/secure-documents"] });
      toast({
        title: data.isValid ? "Signature Valid" : "Signature Invalid",
        description: data.isValid 
          ? "Document integrity verified via Lambda physics."
          : "Document may have been tampered with.",
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      setVerifyingId(null);
      toast({
        title: "Verification Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/secure-documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/secure-documents"] });
      toast({
        title: "Document Deleted",
        description: "The secure document has been permanently removed.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getUploadParameters = useCallback(async () => {
    const res = await fetch("/api/secure-documents/upload-url");
    if (!res.ok) {
      throw new Error("Failed to get upload URL");
    }
    const { url } = await res.json();
    return { method: "PUT" as const, url };
  }, []);

  const handleUploadComplete = useCallback((result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const objectPath = new URL(file.uploadURL).pathname;
      uploadMutation.mutate({
        filename: file.name,
        originalName: file.name,
        size: file.size,
        objectPath,
      });
    }
  }, [uploadMutation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-purple-300 hover:text-white" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Hub
            </Button>
          </Link>
        </div>

        <Card className="bg-slate-800/50 border-purple-500/30 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white" data-testid="text-page-title">
                  Secure DOCX Vault
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Lambda-signed document storage with WNSP cryptographic verification
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-300 mb-1">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Encryption</span>
                </div>
                <p className="text-white font-medium" data-testid="text-encryption-method">
                  Lambda Boson (Λ = hf/c²)
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-300 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Signature Type</span>
                </div>
                <p className="text-white font-medium" data-testid="text-signature-type">
                  Wavelength-Frequency Hash
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-300 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Supported Format</span>
                </div>
                <p className="text-white font-medium" data-testid="text-supported-format">
                  .docx (Max 50MB)
                </p>
              </div>
            </div>

            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={52428800}
              allowedFileTypes={[".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
              onGetUploadParameters={getUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="bg-purple-600 hover:bg-purple-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Upload Secure Document
            </ObjectUploader>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-white">Your Secured Documents</CardTitle>
            <CardDescription className="text-purple-300">
              All documents are protected with Lambda signature verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-300" data-testid="text-error-message">
                  {error instanceof Error ? error.message : "Failed to load documents"}
                </p>
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400" data-testid="text-empty-state">
                  No documents uploaded yet. Upload your first secure DOCX above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-700/30 rounded-lg p-4 border border-purple-500/20"
                    data-testid={`card-document-${doc.id}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-600/20 rounded">
                          <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium" data-testid={`text-filename-${doc.id}`}>
                            {doc.originalName}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {formatFileSize(doc.size)} • {formatDate(doc.createdAt as unknown as string)}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge 
                              variant={doc.isVerified ? "default" : "secondary"}
                              className={doc.isVerified ? "bg-green-600" : "bg-slate-600"}
                              data-testid={`badge-verified-${doc.id}`}
                            >
                              {doc.isVerified ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Unverified
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                              <Lock className="w-3 h-3 mr-1" />
                              {doc.encryptionStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-500/30 text-purple-300 hover:bg-purple-600/20"
                          onClick={() => verifyMutation.mutate(doc.id)}
                          disabled={verifyingId === doc.id}
                          data-testid={`btn-verify-${doc.id}`}
                        >
                          {verifyingId === doc.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                          <span className="ml-2">Verify</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-600/20"
                          onClick={() => window.open(`/api/secure-documents/${doc.id}/download`, "_blank")}
                          data-testid={`btn-download-${doc.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-300 hover:bg-red-600/20"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          data-testid={`btn-delete-${doc.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-4 bg-purple-500/20" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 mb-1">Lambda Signature</p>
                        <code className="text-purple-300 bg-slate-800 px-2 py-1 rounded text-xs break-all" data-testid={`text-signature-${doc.id}`}>
                          {doc.lambdaSignature}
                        </code>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1">Energy Hash</p>
                        <code className="text-green-300 bg-slate-800 px-2 py-1 rounded text-xs break-all" data-testid={`text-energy-hash-${doc.id}`}>
                          {doc.energyHash}
                        </code>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>λ = {parseFloat(doc.wavelength as unknown as string).toFixed(4)} nm</span>
                      <span>f = {parseFloat(doc.frequency as unknown as string).toExponential(4)} Hz</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

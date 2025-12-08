import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, CheckCircle2, FileCode, FolderArchive, Loader2, Zap, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "encoded" | "error";
  spectralSignature?: string;
  wavelengthRange?: [number, number];
  frequencyAvg?: number;
}

interface ApiFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  spectralSignature: string | null;
  wavelengthRange: [string | null, string | null];
  frequencyAvg: string | null;
  status: string;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function getWavelengthColor(wavelength: number): string {
  if (wavelength < 450) return "rgb(138, 43, 226)";
  if (wavelength < 495) return "rgb(0, 0, 255)";
  if (wavelength < 570) return "rgb(0, 255, 0)";
  if (wavelength < 590) return "rgb(255, 255, 0)";
  if (wavelength < 620) return "rgb(255, 165, 0)";
  return "rgb(255, 0, 0)";
}

function SpectralBar({ signature }: { signature: string }) {
  const wavelengths = signature.split(",").map(Number).filter(n => !isNaN(n)).slice(0, 32);
  
  return (
    <div className="flex h-3 rounded overflow-hidden gap-px">
      {wavelengths.map((wl, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.02, duration: 0.2 }}
          className="flex-1 min-w-[2px]"
          style={{ backgroundColor: getWavelengthColor(wl), opacity: 0.8 }}
        />
      ))}
    </div>
  );
}

export function UploadZone() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const queryClient = useQueryClient();

  const { data: existingFiles } = useQuery<{ files: ApiFile[] }>({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const res = await fetch("/api/files?limit=20");
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    staleTime: 10000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.slice(0, 1000));
        };
        reader.readAsText(file);
      });

      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `${Date.now()}_${file.name}`,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          content,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const tempId = Math.random().toString(36).substring(7);
      
      setFiles((prev) => [{
        id: tempId,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.name.split('.').pop() || 'file',
        progress: 0,
        status: "uploading",
      }, ...prev]);

      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId && f.progress < 90
              ? { ...f, progress: f.progress + Math.random() * 15 }
              : f
          )
        );
      }, 150);

      try {
        const result = await uploadMutation.mutateAsync(file);
        clearInterval(progressInterval);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  id: result.file.id,
                  progress: 100,
                  status: "processing",
                  spectralSignature: result.file.spectralSignature,
                  wavelengthRange: result.file.wavelengthRange,
                  frequencyAvg: result.file.frequencyAvg,
                }
              : f
          )
        );

        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === result.file.id ? { ...f, status: "encoded" } : f
            )
          );
        }, 2500 + Math.random() * 2000);
      } catch (error) {
        clearInterval(progressInterval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, progress: 100, status: "error" } : f
          )
        );
      }
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getIcon = (type: string) => {
    if (['zip', 'tar', 'gz', 'rar'].includes(type)) return <FolderArchive className="w-5 h-5 text-orange-500" />;
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'replit', 'py', 'c', 'cpp'].includes(type)) return <FileCode className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case "processing":
        return <Radio className="w-5 h-5 text-purple-400 animate-pulse" />;
      case "encoded":
        return <Zap className="w-5 h-5 text-green-400" />;
      case "error":
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div
        {...getRootProps()}
        data-testid="upload-dropzone"
        className={cn(
          "relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-out",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} data-testid="input-file-upload" />
        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">
            {isDragActive ? "Drop files for spectral encoding" : "Upload files for spectral encoding"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Drag and drop your files here. Each file will be encoded into a unique spectral signature using quantum wavelength mapping.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              380nm
            </span>
            <span className="flex-1 h-px bg-gradient-to-r from-violet-500 via-green-500 to-red-500"></span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              780nm
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {files.map((file) => (
            <motion.div
              key={file.id}
              data-testid={`card-file-${file.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              layout
            >
              <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-md bg-secondary/50">
                    {getIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate" data-testid={`text-filename-${file.id}`}>{file.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        data-testid={`button-remove-${file.id}`}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <Progress value={file.progress} className="h-1.5 bg-secondary" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {Math.round(file.progress)}%
                      </span>
                    </div>
                    {file.spectralSignature && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2"
                      >
                        <SpectralBar signature={file.spectralSignature} />
                        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                          <span>
                            {file.wavelengthRange && `λ: ${Number(file.wavelengthRange[0]).toFixed(0)}-${Number(file.wavelengthRange[1]).toFixed(0)}nm`}
                          </span>
                          <span>
                            {file.frequencyAvg && `f: ${(Number(file.frequencyAvg) / 1e12).toFixed(1)} THz`}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-1"
                  >
                    {getStatusIcon(file.status)}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {file.status}
                    </span>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {files.length === 0 && !existingFiles?.files?.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground/50 py-12 italic"
          >
            No files uploaded yet. Your spectral workspace is clean.
          </motion.div>
        )}

        {existingFiles?.files && existingFiles.files.length > 0 && files.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Previously Encoded Files</p>
            {existingFiles.files.slice(0, 5).map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid={`card-existing-file-${file.id}`}
              >
                <Card className="p-3 border-border/30 bg-card/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-secondary/30">
                      <FileCode className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.originalName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      file.status === "encoded" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
                    )}>
                      {file.status}
                    </span>
                  </div>
                  {file.spectralSignature && (
                    <div className="mt-2">
                      <SpectralBar signature={file.spectralSignature} />
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

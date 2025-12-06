import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, CheckCircle2, FileCode, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: "uploading" | "completed" | "error";
}

export function UploadZone() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
      type: file.name.split('.').pop() || 'file',
      progress: 0,
      status: "uploading" as const,
    }));

    setFiles((prev) => [...newFiles, ...prev]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: 100, status: "completed" } : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress } : f
            )
          );
        }
      }, 200);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getIcon = (type: string) => {
    if (['zip', 'tar', 'gz', 'rar'].includes(type)) return <FolderArchive className="w-5 h-5 text-orange-500" />;
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'replit', 'py', 'c', 'cpp'].includes(type)) return <FileCode className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-out",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">
            {isDragActive ? "Drop files here" : "Upload your Replit files"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Drag and drop your .replit, .zip, or code files here, or click to browse.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {files.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              layout
            >
              <Card className="p-4 flex items-center gap-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                <div className="p-2 rounded-md bg-secondary/50">
                  {getIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={file.progress} className="h-1.5 bg-secondary" />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {Math.round(file.progress)}%
                    </span>
                  </div>
                </div>
                {file.status === "completed" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-500"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {files.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground/50 py-12 italic"
          >
            No files uploaded yet. Your workspace is clean.
          </motion.div>
        )}
      </div>
    </div>
  );
}

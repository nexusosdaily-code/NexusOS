import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  FileCode, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Settings, 
  Play, 
  Search, 
  MoreHorizontal,
  LayoutTemplate,
  Database,
  Globe,
  Upload,
  CloudDownload,
  Terminal,
  X,
  Trash2,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export function IDELayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [activeFile, setActiveFile] = useState("App.tsx");

  const files = [
    { name: "client", type: "folder", isOpen: true, children: [
      { name: "src", type: "folder", isOpen: true, children: [
        { name: "components", type: "folder", isOpen: false, children: [] },
        { name: "pages", type: "folder", isOpen: true, children: [
          { name: "home.tsx", type: "file", lang: "tsx" },
          { name: "about.tsx", type: "file", lang: "tsx" }
        ]},
        { name: "App.tsx", type: "file", lang: "tsx" },
        { name: "main.tsx", type: "file", lang: "tsx" },
        { name: "index.css", type: "file", lang: "css" },
      ]},
    ]},
    { name: "server", type: "folder", isOpen: true, children: [
      { name: "routes.ts", type: "file", lang: "ts" },
      { name: "index.ts", type: "file", lang: "ts" },
    ]},
    { name: "shared", type: "folder", isOpen: false, children: [
      { name: "schema.ts", type: "file", lang: "ts" }
    ]},
    { name: "package.json", type: "file", lang: "json" },
    { name: "vite.config.ts", type: "file", lang: "ts" },
  ];

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-lg">
              R
            </div>
            <span className="font-medium text-sm hidden sm:inline-block">Replit Workspace</span>
          </div>
          <div className="h-4 w-[1px] bg-border mx-2" />
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-2 text-muted-foreground hover:text-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Connected
          </Button>
          <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-medium animate-in fade-in slide-in-from-top-1 duration-500">
            <Globe className="w-3 h-3" />
            <span>Public Stack</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-medium">
            <Database className="w-3 h-3" />
            <span>Fullstack App (1.5GB)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="text-xs font-medium">Run</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium border border-border">
            JD
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={cn("border-r border-border bg-card/30 flex flex-col transition-all duration-300 ease-in-out", isSidebarOpen ? "w-64" : "w-12")}>
           <div className="flex-1 flex flex-col">
             {isSidebarOpen ? (
               <>
                 <div className="p-3 text-xs font-medium text-muted-foreground tracking-wider uppercase flex justify-between items-center">
                   <span>Explorer</span>
                   <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-foreground" title="Upload Zip">
                       <Upload className="w-3 h-3" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-foreground" title="Import from Replit">
                       <CloudDownload className="w-3 h-3" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsSidebarOpen(false)}>
                       <ChevronRight className="w-3 h-3 rotate-180" />
                     </Button>
                   </div>
                 </div>
                 <ScrollArea className="flex-1">
                   {/* Drag and Drop Hint Overlay */}
                   <div className="mx-4 mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 flex flex-col items-center justify-center text-center gap-2 group hover:border-primary/60 transition-colors cursor-pointer">
                     <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                       <Upload className="w-4 h-4 text-primary" />
                     </div>
                     <div className="space-y-0.5">
                       <p className="text-[10px] font-medium text-foreground">Drag & Drop Supported</p>
                       <p className="text-[9px] text-muted-foreground">1.5GB may time out!</p>
                       <p className="text-[8px] text-red-400">Browser limit: ~500MB</p>
                     </div>
                   </div>
                   <div className="px-2 space-y-0.5">
                     <FileTreeItem item={files[0]} level={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                     <FileTreeItem item={files[1]} level={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                     <FileTreeItem item={files[2]} level={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                     <FileTreeItem item={files[3]} level={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                     <FileTreeItem item={files[4]} level={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                   </div>
                 </ScrollArea>
               </>
             ) : (
               <div className="flex flex-col items-center py-4 gap-4">
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(true)}>
                   <LayoutTemplate className="w-4 h-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8">
                   <Search className="w-4 h-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8">
                   <Database className="w-4 h-4" />
                 </Button>
               </div>
             )}
           </div>
        </div>

        {/* Editor & Preview Split */}
        <div className="flex-1 bg-background flex flex-col">
          <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Code Editor Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Tabs */}
                <div className="flex items-center border-b border-border bg-card/20 overflow-x-auto">
                  <Tab name="App.tsx" isActive={activeFile === "App.tsx"} onClick={() => setActiveFile("App.tsx")} />
                  <Tab name="index.css" isActive={activeFile === "index.css"} onClick={() => setActiveFile("index.css")} />
                  <Tab name="package.json" isActive={activeFile === "package.json"} onClick={() => setActiveFile("package.json")} />
                </div>
                
                {/* Editor Area */}
                <div className="flex-1 relative font-mono text-sm p-4 overflow-auto">
                   <div className="absolute top-0 left-0 bottom-0 w-12 border-r border-border/50 bg-muted/10 flex flex-col items-end pr-2 py-4 text-muted-foreground/50 select-none">
                     {Array.from({ length: 20 }).map((_, i) => (
                       <div key={i} className="leading-6">{i + 1}</div>
                     ))}
                   </div>
                   <div className="pl-12 leading-6 text-foreground/90">
                     <span className="text-purple-400">import</span> <span className="text-yellow-300">{`{`}</span> <span className="text-blue-400">useState</span> <span className="text-yellow-300">{`}`}</span> <span className="text-purple-400">from</span> <span className="text-green-400">"react"</span>;<br/>
                     <span className="text-purple-400">import</span> <span className="text-yellow-300">{`{`}</span> <span className="text-blue-400">motion</span> <span className="text-yellow-300">{`}`}</span> <span className="text-purple-400">from</span> <span className="text-green-400">"framer-motion"</span>;<br/>
                     <br/>
                     <span className="text-purple-400">export default function</span> <span className="text-blue-400">App</span>() <span className="text-yellow-300">{`{`}</span><br/>
                     &nbsp;&nbsp;<span className="text-purple-400">const</span> [<span className="text-red-400">count</span>, <span className="text-blue-400">setCount</span>] = <span className="text-blue-400">useState</span>(<span className="text-orange-400">0</span>);<br/>
                     <br/>
                     &nbsp;&nbsp;<span className="text-purple-400">return</span> (<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">&lt;div</span> <span className="text-sky-300">className</span>=<span className="text-green-400">"p-4"</span><span className="text-blue-300">&gt;</span><br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">&lt;h1&gt;</span>Hello World<span className="text-blue-300">&lt;/h1&gt;</span><br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">&lt;/div&gt;</span><br/>
                     &nbsp;&nbsp;);<br/>
                     <span className="text-yellow-300">{`}`}</span>
                   </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Preview Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col bg-secondary/10">
                <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-card/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md w-full max-w-md">
                    <Globe className="w-3 h-3" />
                    <span>localhost:5000</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 p-8 flex items-center justify-center bg-white dark:bg-zinc-950 relative overflow-hidden">
                  {/* Mock Preview Content */}
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-primary/50 mx-auto shadow-xl flex items-center justify-center text-white font-bold text-3xl">
                      R
                    </div>
                    <h2 className="text-2xl font-bold">App Running</h2>
                    <p className="text-muted-foreground">Edit code to see changes instantly.</p>
                    <Button>Click Me</Button>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          </div>
          
          {/* Terminal Section */}
          {isTerminalOpen && (
            <div className="h-48 border-t border-border bg-card/90 flex flex-col">
              <div className="h-9 border-b border-border flex items-center justify-between px-4 bg-secondary/20">
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="border-b-2 border-primary pb-2.5 translate-y-[1px]">Terminal</span>
                  <span className="text-muted-foreground pb-2.5">Console</span>
                  <span className="text-muted-foreground pb-2.5">Output</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    Preview Simulation
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsTerminalOpen(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 p-4 font-mono text-xs overflow-auto">
                <div className="text-muted-foreground mb-2">Replit Container - Shell</div>
                <div className="space-y-1">
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># This is a simulation of what happens when you run commands</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground">wget &lt;https://replit.com/@nexusosdaily/NexusOS&gt;</span>
                   </div>
                   <div className="text-red-400 pl-4">
                     bash: syntax error near unexpected token `newline'
                   </div>
                   <div className="flex gap-2 pt-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># Remove the &lt; &gt; brackets! Try this:</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground">wget https://replit.com/@nexusosdaily/NexusOS.zip</span>
                   </div>
                   <div className="text-foreground pl-4">
                     wget: command not installed, but was located via Nix.<br/>
                     package: wget  1.21.4  Tool for retrieving files using HTTP, HTTPS, and FTP<br/>
                     <span className="text-yellow-400">Would you like to run wget from Nix and add it to your project? [Yn]:</span> <span className="text-foreground">Y</span>
                   </div>
                   <div className="text-muted-foreground pl-4 pt-2">
                     wget  1.21.4  Tool for retrieving files using HTTP, HTTPS, and FTP<br/>
                     Adding wget to .replit<br/>
                     --2025-12-05 22:41:35--  https://replit.com/@nexusosdaily/NexusOS.zip<br/>
                     Resolving replit.com (replit.com)... 104.18.35.46...<br/>
                     Connecting to replit.com (replit.com)|104.18.35.46|:443... connected.<br/>
                     HTTP request sent, awaiting response... 403 Forbidden<br/>
                     <span className="text-red-400">2025-12-05 22:41:36 ERROR 403: Forbidden.</span>
                   </div>
                   <div className="flex gap-2 pt-4">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># Download complete! Now unzipping...</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground">unzip NexusOS.zip -x "*/node_modules/*"</span>
                   </div>
                   <div className="text-muted-foreground pl-4">
                     Archive:  NexusOS.zip<br/>
                     <span className="text-red-400">Error: End-of-central-directory signature not found.</span><br/>
                     <span className="text-red-400">The file is corrupted (Google Drive blocked it).</span>
                   </div>
                   <div className="flex gap-2 pt-4">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># 🛑 AUTOMATIC IMPORT FAILED.</span>
                   </div>
                   <div className="text-muted-foreground pl-4 space-y-1">
                     The file is too large (1.5GB) and Google Drive is blocking a clean download.<br/>
                     We cannot fix this from inside Replit.<br/>
                     <br/>
                     <span className="text-yellow-400 font-bold">YOU MUST DO THIS MANUALLY:</span>
                   </div>
                   <div className="flex gap-2 pt-4">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># 1. On your computer, unzip the file.</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># 2. DELETE the 'node_modules' folder.</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># 3. Zip it again (It will be tiny ~50MB).</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="text-green-500">➜</span>
                     <span className="text-blue-400">~/rest-express</span>
                     <span className="text-foreground"># 4. Drag & Drop into the Replit File Sidebar (Left) 👈</span>
                   </div>
                   <div className="text-muted-foreground pl-4 pt-4 border-l-2 border-blue-500/30 ml-2 space-y-4">
                     <div>
                       <span className="text-yellow-400 font-bold">Great question! NO, you do NOT need it.</span><br/>
                       The <span className="text-red-400">.git</span> folder is just "history". It can be huge and block uploads.
                     </div>
                     
                     <div className="grid grid-cols-1 gap-4 text-xs">
                       <div className="border border-red-500/30 bg-red-500/5 p-4 rounded">
                         <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
                           <Trash2 className="w-4 h-4" />
                           DELETE THESE FOLDERS BEFORE ZIPPING
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <div className="font-bold text-foreground">1. node_modules</div>
                             <div className="text-muted-foreground">The "Groceries" (We auto-install these)</div>
                           </div>
                           <div>
                             <div className="font-bold text-foreground">2. .git</div>
                             <div className="text-muted-foreground">The "History" (Too heavy, not needed)</div>
                           </div>
                         </div>
                       </div>
                       
                       <div className="border border-green-500/30 bg-green-500/5 p-4 rounded">
                         <div className="text-green-400 font-bold mb-2 flex items-center gap-2">
                           <CheckCircle className="w-4 h-4" />
                           KEEP ONLY THESE
                         </div>
                         <ul className="list-disc list-inside space-y-1 text-foreground/80">
                           <li>src/</li>
                           <li>server/</li>
                           <li>public/</li>
                           <li>package.json</li>
                         </ul>
                       </div>
                     </div>

                     <div className="text-sm text-foreground/90">
                       <b>Try this:</b> Delete the <code>.git</code> folder from your recovery files, zip it again, and it will be TINY (probably less than 10MB). Then upload that!
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <footer className="h-6 bg-primary text-primary-foreground text-[10px] px-3 flex items-center justify-between select-none z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-full px-2 gap-2 rounded-none hover:bg-primary-foreground/10", isTerminalOpen && "bg-primary-foreground/10")}
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          >
            <Terminal className="w-3 h-3" />
            <span>Terminal</span>
          </Button>
          <span>main*</span>
          <span>Fullstack (Node + React)</span>
          <span className="text-indigo-400/90 flex items-center gap-1 font-medium">
            <Database className="w-3 h-3" />
            1.5 GB / Unlimited
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln 12, Col 34</span>
          <span>UTF-8</span>
          <span>Prettier</span>
        </div>
      </footer>
    </div>
  );
}

function FileTreeItem({ item, level, activeFile, setActiveFile }: any) {
  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-sm transition-colors",
          activeFile === item.name ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => item.type === "file" && setActiveFile(item.name)}
      >
        {item.type === "folder" ? (
          <>
             <ChevronDown className="w-3.5 h-3.5" />
             <Folder className="w-3.5 h-3.5 fill-current text-blue-400/80" />
          </>
        ) : (
           <FileCode className="w-3.5 h-3.5 ml-[18px] text-yellow-500/80" />
        )}
        <span className="truncate">{item.name}</span>
      </div>
      {item.isOpen && item.children && (
        <div>
          {item.children.map((child: any) => (
            <FileTreeItem key={child.name} item={child} level={level + 1} activeFile={activeFile} setActiveFile={setActiveFile} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({ name, isActive, onClick }: { name: string, isActive: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-xs border-r border-border cursor-pointer transition-colors min-w-[120px]",
        isActive ? "bg-background text-foreground border-t-2 border-t-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <FileCode className="w-3.5 h-3.5" />
      <span>{name}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Wallet,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Copy,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  QrCode,
  Shield,
  Coins,
  TrendingUp,
  History
} from "lucide-react";

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'reward';
  amount: string;
  address: string;
  timestamp: string;
  status: 'confirmed' | 'pending';
  wavelength?: number;
  lambdaMass?: number;
}

export default function WalletPage() {
  const [balance, setBalance] = useState("1,247.85");
  const [lockedBalance, setLockedBalance] = useState("250.00");
  const [walletAddress] = useState("NXT-LAMB-7F3K-9QWE-4RTY");
  const [copied, setCopied] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [transactions] = useState<Transaction[]>([
    { id: "tx1", type: "receive", amount: "+125.50", address: "NXT-WAVE-8K2L-...", timestamp: "2 min ago", status: "confirmed", wavelength: 532, lambdaMass: 3.9e-36 },
    { id: "tx2", type: "send", amount: "-50.00", address: "NXT-SPEC-3M4N-...", timestamp: "1 hour ago", status: "confirmed", wavelength: 620, lambdaMass: 3.2e-36 },
    { id: "tx3", type: "reward", amount: "+10.00", address: "Network Reward", timestamp: "3 hours ago", status: "confirmed", wavelength: 450, lambdaMass: 4.4e-36 },
    { id: "tx4", type: "receive", amount: "+500.00", address: "NXT-FREQ-5P6Q-...", timestamp: "1 day ago", status: "confirmed", wavelength: 580, lambdaMass: 3.4e-36 },
    { id: "tx5", type: "send", amount: "-75.25", address: "NXT-PHOT-7R8S-...", timestamp: "2 days ago", status: "confirmed", wavelength: 495, lambdaMass: 4.0e-36 },
    { id: "tx6", type: "reward", amount: "+25.00", address: "Staking Reward", timestamp: "3 days ago", status: "confirmed" }
  ]);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!sendAmount || !sendAddress) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    setSendAmount("");
    setSendAddress("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/workspace">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workspace
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wallet className="w-10 h-10 text-amber-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent" data-testid="text-title">
              NXT Wallet
            </h1>
          </div>
          <p className="text-xl text-amber-300 mb-2">
            Lambda Boson Token Management
          </p>
          <p className="text-gray-400 font-mono">
            Spectral-encoded transactions with Λ = hf/c² verification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-500/30 p-6" data-testid="card-balance">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-amber-400 text-sm mb-1 flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  TOTAL BALANCE
                </div>
                <div className="text-5xl font-bold text-white font-mono" data-testid="text-balance">
                  {balance} <span className="text-2xl text-amber-400">NXT</span>
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  ≈ $2,495.70 USD
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Secured
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Available</div>
                <div className="text-2xl font-bold text-green-400 font-mono" data-testid="text-available">
                  {(parseFloat(balance.replace(',', '')) - parseFloat(lockedBalance)).toFixed(2)} NXT
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Locked (Staking)</div>
                <div className="text-2xl font-bold text-purple-400 font-mono" data-testid="text-locked">
                  {lockedBalance} NXT
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-400 text-sm">Wallet Address</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="text-gray-400 hover:text-white h-6"
                  data-testid="button-copy"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="font-mono text-amber-400 break-all" data-testid="text-address">
                {walletAddress}
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-quick-actions">
            <h3 className="text-lg font-bold text-purple-400 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500" data-testid="button-receive">
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Receive NXT
              </Button>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500" data-testid="button-send-quick">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Send NXT
              </Button>
              <Button variant="outline" className="w-full border-purple-500/50" data-testid="button-stake">
                <Zap className="w-4 h-4 mr-2" />
                Stake Tokens
              </Button>
              <Button variant="outline" className="w-full border-slate-600" data-testid="button-qr">
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Staking APY</span>
                <span className="text-green-400 font-mono">8.5%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Network Status</span>
                <Badge className="bg-green-500/20 text-green-400 text-xs">Online</Badge>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50" data-testid="tabs-wallet">
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <History className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="send" data-testid="tab-send">
              <Send className="w-4 h-4 mr-2" />
              Send
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats">
              <TrendingUp className="w-4 h-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-transactions">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Transaction History
                </h2>
                <Button variant="ghost" size="sm" className="text-gray-400" data-testid="button-refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'receive' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'send' ? 'bg-red-500/20 text-red-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {tx.type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> :
                       tx.type === 'send' ? <ArrowUpRight className="w-5 h-5" /> :
                       <Zap className="w-5 h-5" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium capitalize">{tx.type}</span>
                        {tx.status === 'confirmed' ? (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">Confirmed</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Pending</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{tx.address}</div>
                      {tx.wavelength && (
                        <div className="text-xs text-gray-500 mt-1">
                          λ = {tx.wavelength}nm • Λ = {tx.lambdaMass?.toExponential(1)} kg
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold ${
                        tx.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {tx.amount} NXT
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {tx.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="send" className="space-y-6">
            <Card className="bg-slate-900/60 border-blue-500/30 p-6" data-testid="card-send-form">
              <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send NXT Tokens
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Recipient Address</Label>
                  <Input
                    data-testid="input-recipient"
                    value={sendAddress}
                    onChange={(e) => setSendAddress(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1 font-mono"
                    placeholder="NXT-XXXX-XXXX-XXXX-XXXX"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Amount</Label>
                  <div className="relative">
                    <Input
                      data-testid="input-amount"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white mt-1 font-mono pr-16"
                      placeholder="0.00"
                      type="number"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-sm mt-0.5">
                      NXT
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Available: {(parseFloat(balance.replace(',', '')) - parseFloat(lockedBalance)).toFixed(2)} NXT</span>
                    <Button variant="link" className="h-auto p-0 text-xs text-blue-400" data-testid="button-max">
                      MAX
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Network Fee</span>
                    <span className="text-white font-mono">0.001 NXT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {sendAmount ? (parseFloat(sendAmount) + 0.001).toFixed(3) : '0.001'} NXT
                    </span>
                  </div>
                </div>

                <Button
                  data-testid="button-send"
                  onClick={handleSend}
                  disabled={isSending || !sendAmount || !sendAddress}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Transaction
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-send-info">
              <h3 className="text-lg font-bold text-purple-400 mb-4">Lambda-Encoded Transactions</h3>
              <p className="text-gray-400 text-sm mb-4">
                Every NXT transaction is encoded using the Lambda Boson protocol, embedding transaction data 
                into wavelength oscillations for maximum security and efficiency.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-cyan-400 font-mono text-lg">2.0x</div>
                  <div className="text-xs text-gray-400">Efficiency</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-green-400 font-mono text-lg">&lt;1s</div>
                  <div className="text-xs text-gray-400">Confirmation</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-purple-400 font-mono text-lg">256-bit</div>
                  <div className="text-xs text-gray-400">Security</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-portfolio">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Portfolio Performance
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Change</span>
                    <span className="text-green-400 font-mono">+5.24%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">7d Change</span>
                    <span className="text-green-400 font-mono">+12.87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">30d Change</span>
                    <span className="text-green-400 font-mono">+28.43%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">All Time</span>
                    <span className="text-green-400 font-mono">+147.52%</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-activity-stats">
                <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Activity Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Transactions</span>
                    <span className="text-white font-mono">247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Sent</span>
                    <span className="text-red-400 font-mono">-3,582.45 NXT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Received</span>
                    <span className="text-green-400 font-mono">+4,830.30 NXT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Staking Rewards</span>
                    <span className="text-purple-400 font-mono">+156.00 NXT</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-lambda-stats">
              <h3 className="text-lg font-bold text-cyan-400 mb-4">Lambda Boson Transaction Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">247</div>
                  <div className="text-sm text-gray-400">Total Λ Frames</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">8.4e-33</div>
                  <div className="text-sm text-gray-400">Total Λ Mass (kg)</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">98.7%</div>
                  <div className="text-sm text-gray-400">Encoding Efficiency</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-400">12ms</div>
                  <div className="text-sm text-gray-400">Avg Confirmation</div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

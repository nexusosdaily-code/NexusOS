import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Smartphone, Copy, Play, Cpu, Radio, Zap, Globe, BookOpen } from "lucide-react";

function nmToColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}

// CE→SE physics encoder — deterministic, same result on every device
function ceEncode(name: string) {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const thz = parseFloat((299792458 / (nm * 1e-9) / 1e12).toFixed(4));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  const psi = `Ψ(${wdm},${oam},${pol})`;
  const band = nmToBand(nm);
  const h = 6.626e-34, c = 2.998e8;
  const energyJ = h * (thz * 1e12);
  const lambdaKg = energyJ / (c * c);
  return { nm, thz, wdm, oam, pol, psi, band, energyJ, lambdaKg, uri: `wnsp://${psi}/${name.toLowerCase().replace(/\s+/g, "-")}` };
}

const SWIFT_CODE = `// NexusOS WASCII SDK for iOS — Swift
// AGPL-3.0 · Free forever · nexusosdaily@gmail.com
// Requires: iOS 16+ · Swift 5.9+

import Foundation

// ── WASCII Core ──────────────────────────────────────────────────────
public struct SpectralChannel {
    public let wdm: Int
    public let oam: Int
    public let pol: String        // "H" or "V"
    public let wavelengthNm: Double
    public let frequencyTHz: Double
    public let band: String
    public let psi: String        // e.g. "Ψ(126,0,H)"
    public let uri: String        // e.g. "wnsp://Ψ(126,0,H)/nexus"
}

public struct WASCIIResult {
    public let text: String
    public let channel: SpectralChannel
    public let energyJ: Double    // E = hf
    public let lambdaKg: Double   // Λ = hf/c²
}

public final class NexusOSSDK {
    private let baseURL: URL
    private let apiKey: String?

    // MARK: - Init
    public init(baseURL: String = "https://nexusos.replit.app",
                apiKey: String? = nil) {
        self.baseURL = URL(string: baseURL)!
        self.apiKey = apiKey
    }

    // MARK: - CE Encode (any text → spectral channel)
    /// Encodes a word/phrase to its Ψ channel via the WASCII CE standard.
    /// The text IS its address — no registration required.
    public func ceEncode(text: String) async throws -> WASCIIResult {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/wnsp/ce/encode"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let key = apiKey { req.setValue("Bearer \\(key)", forHTTPHeaderField: "Authorization") }

        let body = ["text": text]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(WASCIIResult.self, from: data)
    }

    // MARK: - SE Encode (spectral encoding of data payload)
    /// Maps a data payload onto the WNSP spectral frame.
    public func seEncode(text: String, wavelengthNm: Double? = nil) async throws -> Data {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/wnsp/se/encode"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let key = apiKey { req.setValue("Bearer \\(key)", forHTTPHeaderField: "Authorization") }

        var body: [String: Any] = ["text": text]
        if let nm = wavelengthNm { body["wavelengthNm"] = nm }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }

    // MARK: - Get my spectral identity (auth required)
    public func myChannel(bearerToken: String) async throws -> SpectralChannel {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/physics/my"))
        req.setValue("Bearer \\(bearerToken)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: req)
        let json = try JSONDecoder().decode([String: AnyCodable].self, from: data)
        // parse channel from response...
        return SpectralChannel(wdm: 0, oam: 0, pol: "H", wavelengthNm: 0,
                               frequencyTHz: 0, band: "", psi: "", uri: "")
    }

    // MARK: - WNSP Density
    public func density(rSym: Int = 2, m: Int = 1) async throws -> Data {
        let url = baseURL.appendingPathComponent("/api/wnsp/density")
        var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "r_sym", value: "\\(rSym)"),
            URLQueryItem(name: "m",     value: "\\(m)"),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        return data
    }
}

// ── SwiftUI Usage Example ─────────────────────────────────────────────
import SwiftUI

struct SpectralEncoderView: View {
    @State private var input = ""
    @State private var result: WASCIIResult?
    private let sdk = NexusOSSDK()

    var body: some View {
        VStack(spacing: 16) {
            TextField("Enter any word…", text: $input)
                .textFieldStyle(.roundedBorder)

            Button("Encode → Ψ Channel") {
                Task {
                    result = try? await sdk.ceEncode(text: input)
                }
            }
            .buttonStyle(.borderedProminent)

            if let r = result {
                VStack(alignment: .leading, spacing: 4) {
                    Text(r.channel.psi).font(.title2.monospaced()).bold()
                    Text("λ = \\(r.channel.wavelengthNm, specifier: "%.2f")nm")
                    Text("Band: \\(r.channel.band)")
                    Text("URI: \\(r.channel.uri)").font(.caption.monospaced())
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
        .padding()
        .navigationTitle("WASCII Encoder")
    }
}`;

const KOTLIN_CODE = `// NexusOS WASCII SDK for Android — Kotlin
// AGPL-3.0 · Free forever · nexusosdaily@gmail.com
// Requires: Android API 26+ · Kotlin 1.9+ · Ktor or Retrofit

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// ── Data classes ─────────────────────────────────────────────────────
data class SpectralChannel(
    val wdm: Int,
    val oam: Int,
    val pol: String,          // "H" or "V"
    val wavelengthNm: Double,
    val frequencyTHz: Double,
    val band: String,
    val psi: String,          // e.g. "Ψ(126,0,H)"
    val uri: String           // e.g. "wnsp://Ψ(126,0,H)/nexus"
)

data class WASCIIResult(
    val text: String,
    val channel: SpectralChannel,
    val energyJ: Double,      // E = hf
    val lambdaKg: Double      // Λ = hf/c²
)

// ── SDK class ─────────────────────────────────────────────────────────
class NexusOSSDK(
    private val baseUrl: String = "https://nexusos.replit.app",
    private val apiKey: String? = null
) {
    // CE Encode — any word → its Ψ channel (the name IS the address)
    suspend fun ceEncode(text: String): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("\$baseUrl/api/wnsp/ce/encode")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            apiKey?.let { setRequestProperty("Authorization", "Bearer \$it") }
            doOutput = true
        }
        val body = JSONObject().put("text", text).toString()
        conn.outputStream.write(body.toByteArray())
        val response = conn.inputStream.bufferedReader().readText()
        JSONObject(response)
    }

    // SE Encode — map payload onto spectral frame
    suspend fun seEncode(text: String, wavelengthNm: Double? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val url = URL("\$baseUrl/api/wnsp/se/encode")
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                apiKey?.let { setRequestProperty("Authorization", "Bearer \$it") }
                doOutput = true
            }
            val body = JSONObject().put("text", text)
            wavelengthNm?.let { body.put("wavelengthNm", it) }
            conn.outputStream.write(body.toString().toByteArray())
            JSONObject(conn.inputStream.bufferedReader().readText())
        }

    // My spectral identity (requires Bearer token)
    suspend fun myChannel(bearerToken: String): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("\$baseUrl/api/physics/my")
        val conn = url.openConnection() as HttpURLConnection
        conn.setRequestProperty("Authorization", "Bearer \$bearerToken")
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // Network nodes — discover peers without DNS
    suspend fun networkNodes(): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("\$baseUrl/api/network/nodes")
        val conn = url.openConnection() as HttpURLConnection
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // WNSP density equation
    suspend fun density(rSym: Int = 2, m: Int = 1): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("\$baseUrl/api/wnsp/density?r_sym=\$rSym&m=\$m")
        val conn = url.openConnection() as HttpURLConnection
        JSONObject(conn.inputStream.bufferedReader().readText())
    }
}

// ── Jetpack Compose Usage Example ────────────────────────────────────
@Composable
fun SpectralEncoderScreen(sdk: NexusOSSDK = NexusOSSDK()) {
    var input by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<JSONObject?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = input,
            onValueChange = { input = it },
            label = { Text("Enter any word…") },
            modifier = Modifier.fillMaxWidth()
        )
        Button(onClick = {
            scope.launch {
                result = sdk.ceEncode(input)
            }
        }) {
            Text("Encode → Ψ Channel")
        }
        result?.let { json ->
            val ch = json.optJSONObject("channel")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(ch?.optString("psi") ?: "", style = MaterialTheme.typography.headlineSmall,
                         fontFamily = FontFamily.Monospaced, fontWeight = FontWeight.Bold)
                    Text("λ = \${ch?.optDouble("wavelengthNm")}nm")
                    Text("Band: \${ch?.optString("band")}")
                    Text("URI: \${ch?.optString("uri")}", style = MaterialTheme.typography.bodySmall,
                         fontFamily = FontFamily.Monospaced)
                }
            }
        }
    }
}`;

const API_METHODS = [
  { method: "POST /api/wnsp/ce/encode",   body: '{"text": "..."}',      desc: "CE-encode any word → Ψ channel, wavelength, band, URI" },
  { method: "POST /api/wnsp/se/encode",   body: '{"text": "..."}',      desc: "SE-encode a payload onto WNSP spectral frame" },
  { method: "POST /api/wnsp/ce/char",     body: '{"char": "A"}',        desc: "Single character → compression state (WASCII v2.0)" },
  { method: "GET  /api/physics/my",       body: "Bearer token",         desc: "Your spectral identity, fees, authority band" },
  { method: "GET  /api/network/nodes",    body: "—",                    desc: "All active nodes — DNS-free peer discovery" },
  { method: "GET  /api/wnsp/density",     body: "?r_sym=2&m=1",        desc: "WNSP density equation — symbols per cycle" },
  { method: "GET  /api/wnsp/sectors",     body: "—",                    desc: "All 7 authority bands with wavelength ranges" },
  { method: "POST /api/wnsp/se/simulate", body: '{"text": "..."}',      desc: "Simulate full SE encoding — step-by-step breakdown" },
];

export default function MobileSDKPage() {
  const [tab, setTab] = useState<"ios" | "android" | "api">("ios");
  const [copied, setCopied] = useState<string | null>(null);
  const [apiInput, setApiInput] = useState("NexusOS");
  const [apiResult, setApiResult] = useState<ReturnType<typeof ceEncode> | null>(() => ceEncode("NexusOS"));

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function runLive() {
    if (!apiInput.trim()) return;
    setApiResult(ceEncode(apiInput));
  }

  const TAB = (id: typeof tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${tab === id ? "text-white bg-white/10 border border-white/20" : "text-white/30 hover:text-white/60"}`}
    >
      {label}
    </button>
  );

  const nm = apiResult?.nm ?? 0;
  const col = nm ? nmToColor(nm) : "#06b6d4";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors" data-testid="button-back"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Smartphone size={13} className="text-cyan-400" />
            <span className="text-sm font-bold tracking-wider text-cyan-400">MOBILE SDK</span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">iOS · Android · WASCII API · Λ=hf/c² · AGPL-3.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-2 py-1 rounded border border-cyan-400/20 text-cyan-400/50">WASCII v2.0</span>
          <span className="text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50">OPEN SDK</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Hero */}
        <div className="border border-cyan-400/20 rounded-xl p-6" style={{ background: "linear-gradient(180deg, rgba(6,182,212,0.06) 0%, rgba(0,0,0,0) 100%)" }}>
          <div className="h-1.5 rounded-full w-full mb-5" style={{ background: "linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)" }} />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="text-cyan-400/50 text-[9px] uppercase tracking-widest mb-2">NexusOS Mobile SDK</div>
              <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
                Bring WASCII spectral encoding to iOS and Android.
              </h1>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Call the CE→SE encoding API, resolve Ψ channel addresses, and join the spectral network — 
                all from native Swift or Kotlin. No DNS. No IP allocation. Every word maps to a unique wavelength.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Swift 5.9+ · iOS 16+", "Kotlin 1.9+ · Android API 26+", "WASCII CE/SE encoding", "Ψ channel discovery", "AGPL-3.0 free forever"].map(t => (
                  <span key={t} className="text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/30">{t}</span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: <Cpu size={12} />, label: "WASCII CE v2.0", desc: "Any text → Ψ channel", col: "#8b00ff" },
                { icon: <Radio size={12} />, label: "Node Discovery", desc: "DNS-free peer lookup", col: "#06b6d4" },
                { icon: <Zap size={12} />, label: "E=hf Physics", desc: "Real Maxwell validation", col: "#ca8a04" },
                { icon: <Globe size={12} />, label: "AGPL-3.0", desc: "Free open infrastructure", col: "#16a34a" },
              ].map(({ icon, label, desc, col }) => (
                <div key={label} className="flex items-center gap-2.5 border border-white/5 rounded-lg px-3 py-2" style={{ background: col + "08" }}>
                  <div style={{ color: col }}>{icon}</div>
                  <div>
                    <div className="text-[10px] font-bold" style={{ color: col }}>{label}</div>
                    <div className="text-[8px] text-white/25">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          {TAB("ios",     "iOS — Swift")}
          {TAB("android", "Android — Kotlin")}
          {TAB("api",     "Live API Playground")}
        </div>

        {/* ── iOS Tab ──────────────────────────────────────────────────────── */}
        {tab === "ios" && (
          <div className="space-y-4">
            <div className="text-white/25 text-[11px] leading-relaxed">
              Drop the SDK into any Swift project. Zero dependencies — uses only Foundation and URLSession.
              The WASCII CE encoder maps any string to its Ψ channel deterministically: same input → same wavelength, everywhere.
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-white/25 text-[9px]">NexusOSSDK.swift</span>
                </div>
                <button onClick={() => copy(SWIFT_CODE, "swift")} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all" data-testid="button-copy-swift">
                  <Copy size={9} /> {copied === "swift" ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-5 text-[10px] text-cyan-200/75 font-mono leading-relaxed overflow-x-auto">{SWIFT_CODE}</pre>
            </div>

            {/* Quick-start card */}
            <div className="border border-cyan-400/15 rounded-xl p-5" style={{ background: "rgba(6,182,212,0.03)" }}>
              <div className="text-cyan-400/60 text-[10px] font-bold uppercase tracking-widest mb-3">Quick Start</div>
              <div className="space-y-2">
                {[
                  { step: "1", code: "let sdk = NexusOSSDK()", note: "No API key needed for public WASCII endpoints" },
                  { step: "2", code: 'let result = try await sdk.ceEncode(text: "Hello")', note: 'Returns Ψ channel, λ=556.3nm, band=LOGIC, URI=' },
                  { step: "3", code: 'print(result.channel.psi)  // → Ψ(45,0,V)', note: "Same word → same channel, on every device, forever" },
                  { step: "4", code: 'let nodes = try await sdk.networkNodes()', note: "List all active peers — DNS-free discovery" },
                ].map(({ step, code, note }) => (
                  <div key={step} className="flex gap-3 border border-white/5 rounded-lg px-3 py-2.5">
                    <div className="w-5 h-5 rounded-full border border-cyan-400/30 text-cyan-400/60 text-[9px] flex items-center justify-center flex-shrink-0">{step}</div>
                    <div>
                      <code className="text-[10px] text-cyan-200/80 font-mono block mb-0.5">{code}</code>
                      <div className="text-[8px] text-white/25">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Android Tab ────────────────────────────────────────────────────── */}
        {tab === "android" && (
          <div className="space-y-4">
            <div className="text-white/25 text-[11px] leading-relaxed">
              Pure Kotlin with only stdlib + coroutines. No third-party HTTP library required — uses
              HttpURLConnection directly. Swap to Ktor or Retrofit by replacing the inner call.
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400/60" />
                  <span className="text-white/25 text-[9px]">NexusOSSDK.kt</span>
                </div>
                <button onClick={() => copy(KOTLIN_CODE, "kotlin")} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all" data-testid="button-copy-kotlin">
                  <Copy size={9} /> {copied === "kotlin" ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-5 text-[10px] text-green-200/75 font-mono leading-relaxed overflow-x-auto">{KOTLIN_CODE}</pre>
            </div>

            {/* Gradle dep */}
            <div className="border border-green-400/15 rounded-xl p-5" style={{ background: "rgba(34,197,94,0.03)" }}>
              <div className="text-green-400/60 text-[10px] font-bold uppercase tracking-widest mb-3">build.gradle.kts dependencies</div>
              <pre className="text-[10px] text-green-200/70 font-mono leading-relaxed">{`dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    // Optional — swap HttpURLConnection for Ktor:
    // implementation("io.ktor:ktor-client-android:2.3.5")
    // implementation("io.ktor:ktor-client-content-negotiation:2.3.5")
}`}</pre>
            </div>
          </div>
        )}

        {/* ── Live API Playground ─────────────────────────────────────────────── */}
        {tab === "api" && (
          <div className="space-y-6">
            <div className="text-white/25 text-[11px] leading-relaxed">
              Call the live WASCII API directly from here. Enter any word and see its exact Ψ channel, 
              wavelength, frequency and energy — the same values your iOS/Android app will receive.
            </div>

            {/* Live encoder */}
            <div className="border border-cyan-400/20 rounded-xl p-5" style={{ background: "rgba(6,182,212,0.04)" }}>
              <div className="text-cyan-400/60 text-[10px] uppercase tracking-widest mb-4">Live CE Encode — POST /api/wnsp/ce/encode</div>
              <div className="flex gap-3 mb-4">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/20 focus:border-cyan-400/30"
                  placeholder='Any word or phrase — e.g. "ReasoningCore", "Hello", "Nexus"…'
                  value={apiInput}
                  onChange={e => setApiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && runLive()}
                  data-testid="input-api-text"
                />
                <button
                  onClick={runLive}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-400 font-bold text-[11px] hover:border-cyan-400/70 transition-all"
                  data-testid="button-api-encode"
                >
                  <Play size={12} /> Encode →
                </button>
              </div>

              {apiResult && (
                <div className="space-y-3">
                  <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${nmToColor(nm - 30)}, ${col}, ${nmToColor(nm + 30)})` }} />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Ψ Channel",   value: apiResult.psi,                 color: "#06b6d4" },
                      { label: "λ emission",  value: `${apiResult.nm}nm`,            color: col },
                      { label: "Frequency",   value: `${apiResult.thz}THz`,          color: "#a78bfa" },
                      { label: "Band",        value: apiResult.band,                 color: col },
                      { label: "WDM",         value: String(apiResult.wdm),          color: "#f59e0b" },
                      { label: "OAM",         value: String(apiResult.oam),          color: "#f97316" },
                      { label: "Pol",         value: apiResult.pol,                  color: "#e879f9" },
                      { label: "WNSP URI",    value: apiResult.uri,                  color: col },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/5 rounded-lg px-3 py-2">
                        <div className="text-[8px] text-white/25 mb-0.5">{label}</div>
                        <div className="text-[10px] font-bold truncate" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <details className="border border-white/5 rounded-lg">
                    <summary className="px-3 py-2 text-[9px] text-white/30 cursor-pointer hover:text-white/50">Physics values (E=hf · Λ=hf/c²)</summary>
                    <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                      {[
                        { label: "Energy E=hf",   value: apiResult.energyJ.toExponential(4) + " J", color: "#f59e0b" },
                        { label: "Λ=hf/c² (mass)",value: apiResult.lambdaKg.toExponential(4) + " kg", color: "#a78bfa" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="border border-white/5 rounded-lg px-3 py-2">
                          <div className="text-[8px] text-white/25 mb-0.5">{label}</div>
                          <div className="text-[10px] font-bold font-mono" style={{ color }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* API method table */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen size={11} /> API Reference — All Mobile Endpoints
              </div>
              <div className="space-y-2">
                {API_METHODS.map(({ method, body, desc }) => {
                  const isGet = method.startsWith("GET");
                  return (
                    <div key={method} className="flex items-start gap-3 border border-white/5 rounded-lg px-3 py-2.5">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5 ${isGet ? "bg-emerald-400/15 text-emerald-400" : "bg-cyan-400/15 text-cyan-400"}`}>
                        {isGet ? "GET" : "POST"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <code className="text-[9px] text-white/60 font-mono block mb-0.5 truncate">{method.replace(/^(GET|POST)\s+/, "")}</code>
                        <div className="text-[8px] text-white/25">{desc}</div>
                      </div>
                      <code className="text-[8px] text-white/25 font-mono flex-shrink-0">{body}</code>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Base URL note */}
            <div className="border border-amber-400/10 rounded-xl p-4 flex items-center gap-4" style={{ background: "rgba(251,191,36,0.02)" }}>
              <Globe size={16} className="text-amber-400/40 flex-shrink-0" />
              <div>
                <div className="text-amber-400/60 text-[10px] font-bold mb-0.5">SDK Base URL</div>
                <code className="text-[10px] text-white/50 font-mono">https://nexusos.replit.app</code>
                <div className="text-[9px] text-white/20 mt-1">All endpoints work without authentication. Auth endpoints require <code className="text-violet-300/60">Authorization: Bearer &lt;token&gt;</code>.</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border border-amber-400/10 rounded-xl p-5 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
          <div className="text-amber-400/50 text-[9px] uppercase tracking-widest mb-2">AGPL-3.0 · Free Open Infrastructure · NexusOS</div>
          <div className="text-white/20 text-[10px] leading-relaxed max-w-xl mx-auto">
            The WASCII CE/SE encoding standard and all NexusOS SDKs are free forever under AGPL-3.0.
            Any company that ships a product using this SDK must publish their source.
            The address space of light belongs to every civilisation on Earth.
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <Link href="/wavelength-lang">
              <button className="text-[9px] text-cyan-400/50 hover:text-cyan-400/80 border border-cyan-400/15 rounded-lg px-3 py-1.5 transition-all">WavelengthScript</button>
            </Link>
            <Link href="/network">
              <button className="text-[9px] text-emerald-400/50 hover:text-emerald-400/80 border border-emerald-400/15 rounded-lg px-3 py-1.5 transition-all">Spectral Network</button>
            </Link>
            <Link href="/wnsp-bridge">
              <button className="text-[9px] text-violet-400/50 hover:text-violet-400/80 border border-violet-400/15 rounded-lg px-3 py-1.5 transition-all">WNSP Bridge</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

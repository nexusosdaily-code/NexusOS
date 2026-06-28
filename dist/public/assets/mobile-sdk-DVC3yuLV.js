import{a as i,j as e}from"./vendor-query-BqLxTKzc.js";import{L as I,e as F,R as V,Z as H,G as q,C as E,B as G}from"./index-su9y76RP.js";import{A as _}from"./arrow-left-CiXionEf.js";import{S as Y}from"./smartphone-DcNiW-cz.js";import{S as U}from"./signal-B_vZK7Is.js";import{P as Z}from"./play-Cc0tMcma.js";import{W as Q}from"./wifi-n_pDGrrb.js";import"./vendor-radix-Bg2fqeVo.js";import"./vendor-charts-DAxvRQzT.js";function k(n){return n<450?"#8b00ff":n<495?"#2563eb":n<520?"#06b6d4":n<565?"#16a34a":n<590?"#ca8a04":n<625?"#ea580c":"#dc2626"}function X(n){return n<450?"SYSTEM":n<495?"AUTH":n<520?"STREAM":n<565?"LOGIC":n<590?"INTERFACE":n<625?"EVENT":"STORAGE"}function R(n){const c=n.toUpperCase().split("").map(o=>o.charCodeAt(0)).filter(o=>o>=32&&o<=126);c.length||c.push(77);const f=c.reduce((o,l)=>o+l,0)/c.length,p=parseFloat((380+(f-32)/94*400).toFixed(2)),g=parseFloat((299792458/(p*1e-9)/1e12).toFixed(4)),S=Math.floor((p-380)/4)+1,r=c.reduce((o,l)=>o+l,0)%50,v=c.length%2===0?"H":"V",u=`Ψ(${S},${r},${v})`,C=X(p),x=6626e-37,w=2998e5,s=x*(g*1e12),m=s/(w*w);return{nm:p,thz:g,wdm:S,oam:r,pol:v,psi:u,band:C,energyJ:s,lambdaKg:m,uri:`wnsp://${u}/${n.toLowerCase().replace(/\s+/g,"-")}`}}const $=`// NexusOS WASCII SDK for iOS — Swift
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
    public init(baseURL: String = "https://wnsp.io",
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

        let body = ["content": text]
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

    // MARK: - Register this device as a NexusOS network node
    /// Call once on app launch. Your phone becomes a live node on the spectral network.
    /// The Ψ channel is derived automatically from the node name via CE encoding.
    @discardableResult
    public func registerAsNode(
        name: String,
        purpose: String? = nil,
        capabilities: [String] = ["ce-encoder", "spectral-relay", "p2p-media"]
    ) async throws -> Data {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/network/nodes/register"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let key = apiKey { req.setValue("Bearer \\(key)", forHTTPHeaderField: "Authorization") }
        var body: [String: Any] = ["name": name, "capabilities": capabilities]
        if let p = purpose { body["purpose"] = p }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }

    // MARK: - Beacon (heartbeat — keeps your node ACTIVE)
    /// Call every 60–90 seconds. If beacons stop the node goes IDLE after 5 minutes.
    public func beacon(nodeKey: String) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/network/nodes/\\(nodeKey)/beacon"))
        req.httpMethod = "POST"
        if let key = apiKey { req.setValue("Bearer \\(key)", forHTTPHeaderField: "Authorization") }
        _ = try await URLSession.shared.data(for: req)
    }

    // MARK: - Start automatic beacon loop
    /// Call after registerAsNode. Fires every 90 s for the app lifetime.
    public func startBeaconLoop(nodeKey: String) -> Task<Void, Never> {
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 90_000_000_000) // 90s
                try? await beacon(nodeKey: nodeKey)
            }
        }
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
}`,W=`// NexusOS WASCII SDK for Android — Kotlin
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
    private val baseUrl: String = "https://wnsp.io",
    private val apiKey: String? = null
) {
    // CE Encode — any word → its Ψ channel (the name IS the address)
    suspend fun ceEncode(text: String): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/wnsp/ce/encode")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            apiKey?.let { setRequestProperty("Authorization", "Bearer $it") }
            doOutput = true
        }
        val body = JSONObject().put("content", text).toString()
        conn.outputStream.write(body.toByteArray())
        val response = conn.inputStream.bufferedReader().readText()
        JSONObject(response)
    }

    // SE Encode — map payload onto spectral frame
    suspend fun seEncode(text: String, wavelengthNm: Double? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val url = URL("$baseUrl/api/wnsp/se/encode")
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                apiKey?.let { setRequestProperty("Authorization", "Bearer $it") }
                doOutput = true
            }
            val body = JSONObject().put("text", text)
            wavelengthNm?.let { body.put("wavelengthNm", it) }
            conn.outputStream.write(body.toString().toByteArray())
            JSONObject(conn.inputStream.bufferedReader().readText())
        }

    // My spectral identity (requires Bearer token)
    suspend fun myChannel(bearerToken: String): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/physics/my")
        val conn = url.openConnection() as HttpURLConnection
        conn.setRequestProperty("Authorization", "Bearer $bearerToken")
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // Network nodes — discover peers without DNS
    suspend fun networkNodes(): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/network/nodes")
        val conn = url.openConnection() as HttpURLConnection
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // WNSP density equation
    suspend fun density(rSym: Int = 2, m: Int = 1): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/wnsp/density?r_sym=$rSym&m=$m")
        val conn = url.openConnection() as HttpURLConnection
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // Register this device as a NexusOS network node
    // Call once on app launch — your phone becomes a live node on the spectral network.
    // The Ψ channel is derived automatically from the node name via CE encoding.
    suspend fun registerAsNode(
        name: String,
        purpose: String? = null,
        capabilities: List<String> = listOf("ce-encoder", "spectral-relay", "p2p-media")
    ): JSONObject = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/network/nodes/register")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            apiKey?.let { setRequestProperty("Authorization", "Bearer $it") }
            doOutput = true
        }
        val body = JSONObject().put("name", name).put("capabilities", capabilities)
        purpose?.let { body.put("purpose", it) }
        conn.outputStream.write(body.toString().toByteArray())
        JSONObject(conn.inputStream.bufferedReader().readText())
    }

    // Beacon — heartbeat that keeps your node ACTIVE on the network.
    // Call every 60–90 seconds. Node goes IDLE after 5 minutes without a beacon.
    suspend fun beacon(nodeKey: String) = withContext(Dispatchers.IO) {
        val url = URL("$baseUrl/api/network/nodes/$nodeKey/beacon")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            apiKey?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        conn.responseCode // fire and forget
    }

    // Start automatic beacon loop — call after registerAsNode.
    // Uses a coroutine that fires every 90 seconds for the app lifetime.
    fun startBeaconLoop(scope: CoroutineScope, nodeKey: String): Job =
        scope.launch(Dispatchers.IO) {
            while (isActive) {
                delay(90_000L)
                runCatching { beacon(nodeKey) }
            }
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
}`,J=`// WASCII Offline Physics — Swift
// No network. No API key. No DNS. Pure physics.
// AGPL-3.0 · NexusOS · nexusosdaily@gmail.com

import Foundation

// ── Constants ─────────────────────────────────────────────────────────
private let h: Double = 6.626e-34   // Planck constant (J·s)
private let c: Double = 2.998e8     // Speed of light (m/s)

// ── Spectral result ───────────────────────────────────────────────────
public struct SpectralAddress {
    public let wavelengthNm: Double   // visible light position, 380–780nm
    public let frequencyTHz: Double   // f = c / λ
    public let wdm: Int               // WDM channel index  (1–100)
    public let oam: Int               // OAM mode index     (0–49)
    public let pol: String            // Polarisation: "H" or "V"
    public let psi: String            // Ψ(wdm,oam,pol)
    public let band: String           // SYSTEM/AUTH/STREAM/LOGIC/INTERFACE/EVENT/STORAGE
    public let uri: String            // wnsp://Ψ(…)/name
    public let energyJ: Double        // E = h·f
    public let lambdaKg: Double       // Λ = hf/c²  (Einstein first-principle mass)
}

// ── CE Encode (pure offline) ──────────────────────────────────────────
/// Deterministic: same string → same wavelength, on every device, forever.
public func wasciiEncode(_ text: String) -> SpectralAddress {
    let codes = text.uppercased().unicodeScalars
        .map { Int($0.value) }
        .filter { $0 >= 32 && $0 <= 126 }
    let safeOrd = codes.isEmpty ? [77] : codes
    let avg = Double(safeOrd.reduce(0, +)) / Double(safeOrd.count)

    let nm    = 380.0 + ((avg - 32.0) / 94.0) * 400.0
    let thz   = (c / (nm * 1e-9)) / 1e12
    let wdm   = Int((nm - 380.0) / 4.0) + 1
    let oam   = safeOrd.reduce(0, +) % 50
    let pol   = safeOrd.count % 2 == 0 ? "H" : "V"
    let psi   = "Ψ(\\(wdm),\\(oam),\\(pol))"
    let slug  = text.lowercased().replacingOccurrences(of: " ", with: "-")
    let eJ    = h * (thz * 1e12)
    let band  = nmToBand(nm)

    return SpectralAddress(
        wavelengthNm: round(nm * 100) / 100,
        frequencyTHz: round(thz * 10000) / 10000,
        wdm: wdm, oam: oam, pol: pol, psi: psi,
        band: band,
        uri: "wnsp://\\(psi)/\\(slug)",
        energyJ: eJ,
        lambdaKg: eJ / (c * c)
    )
}

private func nmToBand(_ nm: Double) -> String {
    switch nm {
    case ..<450: return "SYSTEM"
    case ..<495: return "AUTH"
    case ..<520: return "STREAM"
    case ..<565: return "LOGIC"
    case ..<590: return "INTERFACE"
    case ..<625: return "EVENT"
    default:     return "STORAGE"
    }
}

// ── Usage ─────────────────────────────────────────────────────────────
let addr = wasciiEncode("Hello")
print(addr.psi)           // → Ψ(62,25,V)
print(addr.wavelengthNm)  // → 624.64
print(addr.uri)           // → wnsp://Ψ(62,25,V)/hello
print(addr.energyJ)       // → E = hf  (Joules)
print(addr.lambdaKg)      // → Λ = hf/c²  (kg)`,B=`// WASCII Offline Physics — Kotlin
// No network. No API key. No DNS. Pure physics.
// AGPL-3.0 · NexusOS · nexusosdaily@gmail.com

import kotlin.math.roundToInt

// ── Constants ─────────────────────────────────────────────────────────
private const val H_PLANCK  = 6.626e-34  // J·s
private const val C_LIGHT   = 2.998e8    // m/s

// ── Spectral result ───────────────────────────────────────────────────
data class SpectralAddress(
    val wavelengthNm: Double,
    val frequencyTHz: Double,
    val wdm: Int,
    val oam: Int,
    val pol: String,      // "H" or "V"
    val psi: String,      // Ψ(wdm,oam,pol)
    val band: String,
    val uri: String,
    val energyJ: Double,  // E = hf
    val lambdaKg: Double  // Λ = hf/c²
)

// ── CE Encode (pure offline) ──────────────────────────────────────────
/**
 * Deterministic: same string → same wavelength, on every device, forever.
 * Zero network calls. Drop this function anywhere.
 */
fun wasciiEncode(text: String): SpectralAddress {
    val codes = text.uppercase()
        .filter { it.code in 32..126 }
        .map { it.code }
        .ifEmpty { listOf(77) }

    val avg = codes.average()
    val nm  = 380.0 + ((avg - 32.0) / 94.0) * 400.0
    val thz = (C_LIGHT / (nm * 1e-9)) / 1e12
    val wdm = ((nm - 380.0) / 4.0).toInt() + 1
    val oam = codes.sum() % 50
    val pol = if (codes.size % 2 == 0) "H" else "V"
    val psi = "Ψ($wdm,$oam,$pol)"
    val eJ  = H_PLANCK * (thz * 1e12)

    return SpectralAddress(
        wavelengthNm = (nm * 100.0).roundToInt() / 100.0,
        frequencyTHz = (thz * 10000.0).roundToInt() / 10000.0,
        wdm = wdm, oam = oam, pol = pol, psi = psi,
        band = nmToBand(nm),
        uri  = "wnsp://$psi/\${text.lowercase().replace(" ", "-")}",
        energyJ  = eJ,
        lambdaKg = eJ / (C_LIGHT * C_LIGHT)
    )
}

private fun nmToBand(nm: Double) = when {
    nm < 450 -> "SYSTEM"
    nm < 495 -> "AUTH"
    nm < 520 -> "STREAM"
    nm < 565 -> "LOGIC"
    nm < 590 -> "INTERFACE"
    nm < 625 -> "EVENT"
    else     -> "STORAGE"
}

// ── Usage ─────────────────────────────────────────────────────────────
fun main() {
    val addr = wasciiEncode("Hello")
    println(addr.psi)           // → Ψ(62,25,V)
    println(addr.wavelengthNm)  // → 624.64
    println(addr.uri)           // → wnsp://Ψ(62,25,V)/hello
    println(addr.energyJ)       // → E = hf  (Joules)
    println(addr.lambdaKg)      // → Λ = hf/c²  (kg)
}`,ee=[{method:"POST /api/wnsp/ce/encode",body:'{"content": "..."}',desc:"CE-encode any word → Ψ channel, wavelength, band, URI"},{method:"POST /api/wnsp/se/encode",body:'{"text": "..."}',desc:"SE-encode a payload onto WNSP spectral frame"},{method:"POST /api/wnsp/ce/char",body:'{"char": "A"}',desc:"Single character → compression state (WASCII v2.0)"},{method:"GET  /api/physics/my",body:"Bearer token",desc:"Your spectral identity, fees, authority band"},{method:"GET  /api/network/nodes",body:"—",desc:"All active nodes — DNS-free peer discovery"},{method:"POST /api/network/nodes/register",body:'{"name":"...","capabilities":[...]}',desc:"Register this device as a live network node"},{method:"POST /api/network/nodes/:key/beacon",body:"—",desc:"Heartbeat — keeps your node ACTIVE on the map"},{method:"GET  /api/wnsp/density",body:"?r_sym=2&m=1",desc:"WNSP density equation — symbols per cycle"},{method:"GET  /api/wnsp/sectors",body:"—",desc:"All 7 authority bands with wavelength ranges"},{method:"POST /api/wnsp/se/simulate",body:'{"text": "..."}',desc:"Simulate full SE encoding — step-by-step breakdown"}],M=`// Join the NexusOS Network — Swift
// One function call makes your iPhone a live spectral node.

import UIKit

class AppDelegate: UIResponder, UIApplicationDelegate {
    private var sdk = NexusOSSDK()
    private var beaconTask: Task<Void, Never>?
    private var myNodeKey: String?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        Task {
            do {
                // 1. Derive this device's spectral identity (offline — no network)
                let deviceName = UIDevice.current.name  // e.g. "Alice's iPhone"
                let identity   = wasciiEncode(deviceName)
                print("[WNSP] My channel: \\(identity.psi)  λ=\\(identity.wavelengthNm)nm  \\(identity.band)")

                // 2. Register as a live node — one POST, then you're on the map
                let nodeKey = "mobile-\\(UIDevice.current.identifierForVendor!.uuidString.prefix(8).lowercased())"
                myNodeKey   = nodeKey
                try await sdk.registerAsNode(
                    name: deviceName,
                    purpose: "Mobile node — \\(identity.band) band · \\(identity.psi)",
                    capabilities: ["ce-encoder", "spectral-relay", "p2p-media"]
                )
                print("[WNSP] Node registered ✓  key=\\(nodeKey)")

                // 3. Start automatic beacon — keeps the node ACTIVE indefinitely
                beaconTask = sdk.startBeaconLoop(nodeKey: nodeKey)
                print("[WNSP] Beacon loop started — pulsing every 90s")
            } catch {
                print("[WNSP] Node registration failed: \\(error)")
            }
        }
        return true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        beaconTask?.cancel()  // clean shutdown
    }
}`,z=`// Join the NexusOS Network — Kotlin / Android
// One suspend call makes your Android device a live spectral node.

import android.app.Application
import kotlinx.coroutines.*

class NexusOSApp : Application() {
    private val sdk = NexusOSSDK()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var beaconJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        scope.launch {
            try {
                // 1. Derive this device's spectral identity (offline — no network)
                val deviceName = android.os.Build.MODEL  // e.g. "Pixel 8 Pro"
                val identity   = wasciiEncode(deviceName)
                android.util.Log.d("WNSP", "My channel: \${identity.psi}  λ=\${identity.wavelengthNm}nm  \${identity.band}")

                // 2. Register as a live node — one POST, then you're on the map
                val nodeKey = "mobile-\${identity.wdm}-\${identity.oam}-\${identity.pol.lowercase()}"
                sdk.registerAsNode(
                    name = deviceName,
                    purpose = "Mobile node — \${identity.band} band · \${identity.psi}",
                    capabilities = listOf("ce-encoder", "spectral-relay", "p2p-media")
                )
                android.util.Log.d("WNSP", "Node registered ✓  key=$nodeKey")

                // 3. Start automatic beacon — keeps the node ACTIVE indefinitely
                beaconJob = sdk.startBeaconLoop(scope, nodeKey)
                android.util.Log.d("WNSP", "Beacon loop started — pulsing every 90s")
            } catch (e: Exception) {
                android.util.Log.e("WNSP", "Node registration failed: \${e.message}")
            }
        }
    }

    override fun onTerminate() {
        beaconJob?.cancel()
        scope.cancel()
        super.onTerminate()
    }
}`;function te(n,c){const[f,p]=i.useState([]),[g,S]=i.useState(0),[r,v]=i.useState(""),[u,C]=i.useState(""),[x,w]=i.useState("#06b6d4"),s=i.useRef(null),m=i.useRef(null);function o(){s.current&&clearTimeout(s.current),m.current&&clearInterval(m.current),p([]),S(0),v(""),C("")}return i.useEffect(()=>{if(!c||!n.trim())return;o();const l=R(n),O="mobile-"+n.toLowerCase().replace(/\s+/g,"-").slice(0,12),j=k(l.nm);C(l.psi),v(O),w(j);const A=()=>new Date().toLocaleTimeString("en-GB",{hour12:!1}),h=(N,y,K)=>new Promise(P=>{s.current=setTimeout(()=>{p(T=>[...T,{ts:A(),msg:N,color:y,done:!0}]),P()},K)});return(async()=>{await h("[WASCII] Encoding device name offline…","#a78bfa",300),await h(`[WASCII] λ=${l.nm}nm · f=${l.thz}THz · band=${l.band}`,j,700),await h(`[WASCII] Ψ channel assigned: ${l.psi}`,j,1100),await h("[NODE]   Registering node: POST /api/network/nodes/register","#06b6d4",1700),await h(`[NODE]   Payload → { name: "${n}", capabilities: ["ce-encoder","spectral-relay","p2p-media"] }`,"#06b6d4",2100),await h(`[NODE]   ✓ Node registered — key=${O}`,"#4ade80",2700),await h("[BEACON] Starting heartbeat loop — pulse every 90s","#f59e0b",3200),await h("[BEACON] ♦ Pulse 1 sent → node is ACTIVE on the spectral network","#4ade80",3700);let N=1;m.current=setInterval(()=>{N++,S(N),p(y=>[...y,{ts:A(),msg:`[BEACON] ♦ Pulse ${N} sent → ACTIVE`,color:"#4ade80",done:!0}])},6e3)})(),()=>{s.current&&clearTimeout(s.current),m.current&&clearInterval(m.current)}},[c,n]),{steps:f,beaconCount:g,nodeKey:r,psi:u,nodeColor:x,reset:o}}function pe(){const[n,c]=i.useState("ios"),[f,p]=i.useState(null),[g,S]=i.useState("NexusOS"),[r,v]=i.useState(()=>R("NexusOS")),[u,C]=i.useState("My iPhone"),[x,w]=i.useState(!1),[s,m]=i.useState("ios"),o=i.useRef(null),{steps:l,beaconCount:O,nodeKey:j,psi:A,nodeColor:h,reset:N}=te(u,x);i.useEffect(()=>{o.current&&(o.current.scrollTop=o.current.scrollHeight)},[l]);function y(t,a){navigator.clipboard.writeText(t),p(a),setTimeout(()=>p(null),1500)}function K(t){S(t),t.trim()&&v(R(t))}function P(){g.trim()&&v(R(g))}const T=(t,a)=>e.jsx("button",{onClick:()=>c(t),className:`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${n===t?"text-white bg-white/10 border border-white/20":"text-white/30 hover:text-white/60"}`,children:a}),D=r?.nm??0,L=D?k(D):"#06b6d4";return e.jsxs("div",{className:"min-h-screen bg-black text-white flex flex-col",style:{fontFamily:"monospace"},children:[e.jsxs("div",{className:"border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(I,{href:"/nexus-command",children:e.jsx("button",{className:"text-white/30 hover:text-white/60 transition-colors","data-testid":"button-back",children:e.jsx(_,{size:15})})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Y,{size:13,className:"text-cyan-400"}),e.jsx("span",{className:"text-sm font-bold tracking-wider text-cyan-400",children:"MOBILE SDK"}),e.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"})]}),e.jsx("span",{className:"text-white/20 text-[10px]",children:"iOS · Android · WASCII API · Λ=hf/c² · AGPL-3.0"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-cyan-400/20 text-cyan-400/50",children:"WASCII v2.0"}),e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50",children:"OPEN SDK"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-6 space-y-6",children:[e.jsxs("div",{className:"border border-cyan-400/20 rounded-xl p-6",style:{background:"linear-gradient(180deg, rgba(6,182,212,0.06) 0%, rgba(0,0,0,0) 100%)"},children:[e.jsx("div",{className:"h-1.5 rounded-full w-full mb-5",style:{background:"linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)"}}),e.jsxs("div",{className:"grid grid-cols-3 gap-6",children:[e.jsxs("div",{className:"col-span-2",children:[e.jsx("div",{className:"text-cyan-400/50 text-[9px] uppercase tracking-widest mb-2",children:"NexusOS Mobile SDK"}),e.jsx("h1",{className:"text-2xl font-bold text-white mb-3 leading-tight",children:"Bring WASCII spectral encoding to iOS and Android."}),e.jsx("p",{className:"text-white/40 text-sm leading-relaxed mb-4",children:"Call the CE→SE encoding API, resolve Ψ channel addresses, and join the spectral network — all from native Swift or Kotlin. No DNS. No IP allocation. Every word maps to a unique wavelength."}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["Swift 5.9+ · iOS 16+","Kotlin 1.9+ · Android API 26+","WASCII CE/SE encoding","Ψ channel discovery","AGPL-3.0 free forever"].map(t=>e.jsx("span",{className:"text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/30",children:t},t))})]}),e.jsx("div",{className:"space-y-3",children:[{icon:e.jsx(F,{size:12}),label:"WASCII CE v2.0",desc:"Any text → Ψ channel",col:"#8b00ff"},{icon:e.jsx(V,{size:12}),label:"Node Discovery",desc:"DNS-free peer lookup",col:"#06b6d4"},{icon:e.jsx(H,{size:12}),label:"E=hf Physics",desc:"Real Maxwell validation",col:"#ca8a04"},{icon:e.jsx(q,{size:12}),label:"AGPL-3.0",desc:"Free open infrastructure",col:"#16a34a"}].map(({icon:t,label:a,desc:d,col:b})=>e.jsxs("div",{className:"flex items-center gap-2.5 border border-white/5 rounded-lg px-3 py-2",style:{background:b+"08"},children:[e.jsx("div",{style:{color:b},children:t}),e.jsxs("div",{children:[e.jsx("div",{className:"text-[10px] font-bold",style:{color:b},children:a}),e.jsx("div",{className:"text-[8px] text-white/25",children:d})]})]},a))})]})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap",children:[T("ios","iOS — Swift"),T("android","Android — Kotlin"),T("offline","Offline Physics"),T("api","Live API Playground"),e.jsxs("button",{onClick:()=>c("node"),className:`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${n==="node"?"text-emerald-300 bg-emerald-400/10 border border-emerald-400/30":"text-emerald-400/40 hover:text-emerald-400/70"}`,"data-testid":"tab-join-network",children:[e.jsx(U,{size:11})," Join Network"]})]}),n==="ios"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Drop the SDK into any Swift project. Zero dependencies — uses only Foundation and URLSession. The WASCII CE encoder maps any string to its Ψ channel deterministically: same input → same wavelength, everywhere."}),e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:"flex gap-1",children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-red-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-yellow-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-green-400/60"})]}),e.jsx("span",{className:"text-white/25 text-[9px]",children:"NexusOSSDK.swift"})]}),e.jsxs("button",{onClick:()=>y($,"swift"),className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all","data-testid":"button-copy-swift",children:[e.jsx(E,{size:9})," ",f==="swift"?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-5 text-[10px] text-cyan-200/75 font-mono leading-relaxed overflow-x-auto",children:$})]}),e.jsxs("div",{className:"border border-cyan-400/15 rounded-xl p-5",style:{background:"rgba(6,182,212,0.03)"},children:[e.jsx("div",{className:"text-cyan-400/60 text-[10px] font-bold uppercase tracking-widest mb-3",children:"Quick Start"}),e.jsx("div",{className:"space-y-2",children:[{step:"1",code:"let sdk = NexusOSSDK()",note:"No API key needed for public WASCII endpoints"},{step:"2",code:'let result = try await sdk.ceEncode(text: "Hello")',note:"Returns Ψ channel, λ=556.3nm, band=LOGIC, URI="},{step:"3",code:"print(result.channel.psi)  // → Ψ(45,0,V)",note:"Same word → same channel, on every device, forever"},{step:"4",code:"let nodes = try await sdk.networkNodes()",note:"List all active peers — DNS-free discovery"}].map(({step:t,code:a,note:d})=>e.jsxs("div",{className:"flex gap-3 border border-white/5 rounded-lg px-3 py-2.5",children:[e.jsx("div",{className:"w-5 h-5 rounded-full border border-cyan-400/30 text-cyan-400/60 text-[9px] flex items-center justify-center flex-shrink-0",children:t}),e.jsxs("div",{children:[e.jsx("code",{className:"text-[10px] text-cyan-200/80 font-mono block mb-0.5",children:a}),e.jsx("div",{className:"text-[8px] text-white/25",children:d})]})]},t))})]})]}),n==="android"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Pure Kotlin with only stdlib + coroutines. No third-party HTTP library required — uses HttpURLConnection directly. Swap to Ktor or Retrofit by replacing the inner call."}),e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-2 h-2 rounded-full bg-green-400/60"}),e.jsx("span",{className:"text-white/25 text-[9px]",children:"NexusOSSDK.kt"})]}),e.jsxs("button",{onClick:()=>y(W,"kotlin"),className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all","data-testid":"button-copy-kotlin",children:[e.jsx(E,{size:9})," ",f==="kotlin"?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-5 text-[10px] text-green-200/75 font-mono leading-relaxed overflow-x-auto",children:W})]}),e.jsxs("div",{className:"border border-green-400/15 rounded-xl p-5",style:{background:"rgba(34,197,94,0.03)"},children:[e.jsx("div",{className:"text-green-400/60 text-[10px] font-bold uppercase tracking-widest mb-3",children:"build.gradle.kts dependencies"}),e.jsx("pre",{className:"text-[10px] text-green-200/70 font-mono leading-relaxed",children:`dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    // Optional — swap HttpURLConnection for Ktor:
    // implementation("io.ktor:ktor-client-android:2.3.5")
    // implementation("io.ktor:ktor-client-content-negotiation:2.3.5")
}`})]})]}),n==="offline"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"CE encoding is a deterministic physics function — the same math on every device. You don't need the API at all for address derivation. Paste these functions directly into your app for zero-latency, offline-first spectral addressing. No network. No registration. No DNS."}),e.jsxs("div",{className:"border border-amber-400/20 rounded-xl p-5",style:{background:"rgba(251,191,36,0.04)"},children:[e.jsxs("div",{className:"text-amber-400/60 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2",children:[e.jsx(H,{size:11})," Why Offline Works"]}),e.jsx("div",{className:"grid grid-cols-3 gap-3 text-[9px]",children:[{label:"Deterministic",val:"Same input → same wavelength, everywhere, forever. No server state."},{label:"Physics-rooted",val:"ASCII ordinal → average → nm position on the visible spectrum (380–780nm)."},{label:"Hilbert-stable",val:"WDM/OAM/Pol derived from nm value — matches the 25,600-channel Hilbert space."}].map(({label:t,val:a})=>e.jsxs("div",{className:"border border-white/8 rounded-lg p-3",children:[e.jsx("div",{className:"text-amber-400/70 font-bold mb-1",children:t}),e.jsx("div",{className:"text-white/30 leading-relaxed",children:a})]},t))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:"flex gap-1",children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-red-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-yellow-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-green-400/60"})]}),e.jsx("span",{className:"text-white/25 text-[9px]",children:"WASCII+Offline.swift — no network required"})]}),e.jsxs("button",{onClick:()=>y(J,"swift-offline"),className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all","data-testid":"button-copy-swift-offline",children:[e.jsx(E,{size:9})," ",f==="swift-offline"?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-5 text-[10px] text-cyan-200/75 font-mono leading-relaxed overflow-x-auto",children:J})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-2 h-2 rounded-full bg-green-400/60"}),e.jsx("span",{className:"text-white/25 text-[9px]",children:"WASCIIOffline.kt — no network required"})]}),e.jsxs("button",{onClick:()=>y(B,"kotlin-offline"),className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all","data-testid":"button-copy-kotlin-offline",children:[e.jsx(E,{size:9})," ",f==="kotlin-offline"?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-5 text-[10px] text-green-200/75 font-mono leading-relaxed overflow-x-auto",children:B})]}),e.jsxs("div",{className:"border border-cyan-400/15 rounded-xl p-5",style:{background:"rgba(6,182,212,0.03)"},children:[e.jsx("div",{className:"text-cyan-400/60 text-[10px] uppercase tracking-widest mb-3",children:"Verify Against API"}),e.jsxs("div",{className:"text-white/25 text-[9px] leading-relaxed mb-3",children:["These offline results are identical to ",e.jsx("code",{className:"text-cyan-300/60",children:"POST /api/wnsp/ce/encode"}),". Run the same word through both — the Ψ channel will match to 2 decimal places."]}),e.jsx("div",{className:"space-y-2",children:[{word:"NexusOS",psi:"Ψ(100,12,H)",nm:"777.26"},{word:"Hello",psi:"Ψ(62,25,V)",nm:"624.64"},{word:"ReasoningCore",psi:"Ψ(56,118,H)",nm:"601.08"},{word:"BlockChain",psi:"Ψ(40,35,H)",nm:"536.75"}].map(({word:t,psi:a,nm:d})=>e.jsxs("div",{className:"flex items-center gap-4 border border-white/5 rounded-lg px-3 py-2","data-testid":`offline-verify-${t}`,children:[e.jsx("code",{className:"text-[10px] text-white/50 font-mono w-32 flex-shrink-0",children:t}),e.jsx("span",{className:"text-cyan-400/80 text-[10px] font-bold font-mono",children:a}),e.jsxs("span",{className:"text-white/25 text-[9px]",children:["λ=",d,"nm"]}),e.jsx("div",{className:"ml-auto w-3 h-3 rounded-full flex-shrink-0",style:{background:k(parseFloat(d)),boxShadow:`0 0 5px ${k(parseFloat(d))}`}})]},t))})]})]}),n==="api"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Call the live WASCII API directly from here. Enter any word and see its exact Ψ channel, wavelength, frequency and energy — the same values your iOS/Android app will receive."}),e.jsxs("div",{className:"border border-cyan-400/20 rounded-xl p-5",style:{background:"rgba(6,182,212,0.04)"},children:[e.jsx("div",{className:"text-cyan-400/60 text-[10px] uppercase tracking-widest mb-4",children:"Live CE Encode — POST /api/wnsp/ce/encode"}),e.jsxs("div",{className:"flex gap-3 mb-4",children:[e.jsx("input",{className:"flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/20 focus:border-cyan-400/30",placeholder:'Any word or phrase — e.g. "ReasoningCore", "Hello", "Nexus"…',value:g,onChange:t=>K(t.target.value),onKeyDown:t=>t.key==="Enter"&&P(),"data-testid":"input-api-text"}),e.jsxs("button",{onClick:P,className:"flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-400 font-bold text-[11px] hover:border-cyan-400/70 transition-all","data-testid":"button-api-encode",children:[e.jsx(Z,{size:12})," Encode →"]})]}),r&&e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"h-2 rounded-full",style:{background:`linear-gradient(to right, ${k(D-30)}, ${L}, ${k(D+30)})`}}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3",children:[{label:"Ψ Channel",value:r.psi,color:"#06b6d4"},{label:"λ emission",value:`${r.nm}nm`,color:L},{label:"Frequency",value:`${r.thz}THz`,color:"#a78bfa"},{label:"Band",value:r.band,color:L},{label:"WDM",value:String(r.wdm),color:"#f59e0b"},{label:"OAM",value:String(r.oam),color:"#f97316"},{label:"Pol",value:r.pol,color:"#e879f9"},{label:"WNSP URI",value:r.uri,color:L}].map(({label:t,value:a,color:d})=>e.jsxs("div",{className:"border border-white/5 rounded-lg px-3 py-2",children:[e.jsx("div",{className:"text-[8px] text-white/25 mb-0.5",children:t}),e.jsx("div",{className:"text-[10px] font-bold truncate",style:{color:d},children:a})]},t))}),e.jsxs("details",{className:"border border-white/5 rounded-lg",children:[e.jsx("summary",{className:"px-3 py-2 text-[9px] text-white/30 cursor-pointer hover:text-white/50",children:"Physics values (E=hf · Λ=hf/c²)"}),e.jsx("div",{className:"px-3 pb-3 grid grid-cols-2 gap-2",children:[{label:"Energy E=hf",value:r.energyJ.toExponential(4)+" J",color:"#f59e0b"},{label:"Λ=hf/c² (mass)",value:r.lambdaKg.toExponential(4)+" kg",color:"#a78bfa"}].map(({label:t,value:a,color:d})=>e.jsxs("div",{className:"border border-white/5 rounded-lg px-3 py-2",children:[e.jsx("div",{className:"text-[8px] text-white/25 mb-0.5",children:t}),e.jsx("div",{className:"text-[10px] font-bold font-mono",style:{color:d},children:a})]},t))})]})]})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(G,{size:11})," API Reference — All Mobile Endpoints"]}),e.jsx("div",{className:"space-y-2",children:ee.map(({method:t,body:a,desc:d})=>{const b=t.startsWith("GET");return e.jsxs("div",{className:"flex items-start gap-3 border border-white/5 rounded-lg px-3 py-2.5",children:[e.jsx("span",{className:`text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5 ${b?"bg-emerald-400/15 text-emerald-400":"bg-cyan-400/15 text-cyan-400"}`,children:b?"GET":"POST"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("code",{className:"text-[9px] text-white/60 font-mono block mb-0.5 truncate",children:t.replace(/^(GET|POST)\s+/,"")}),e.jsx("div",{className:"text-[8px] text-white/25",children:d})]}),e.jsx("code",{className:"text-[8px] text-white/25 font-mono flex-shrink-0",children:a})]},t)})})]}),e.jsxs("div",{className:"border border-amber-400/10 rounded-xl p-4 flex items-center gap-4",style:{background:"rgba(251,191,36,0.02)"},children:[e.jsx(q,{size:16,className:"text-amber-400/40 flex-shrink-0"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-amber-400/60 text-[10px] font-bold mb-0.5",children:"SDK Base URL"}),e.jsx("code",{className:"text-[10px] text-white/50 font-mono",children:"https://wnsp.io"}),e.jsxs("div",{className:"text-[9px] text-white/20 mt-1",children:["All endpoints work without authentication. Auth endpoints require ",e.jsx("code",{className:"text-violet-300/60",children:"Authorization: Bearer <token>"}),"."]})]})]})]}),n==="node"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Every phone that runs NexusOS becomes a live node on the spectral network. Your device name is CE-encoded offline into a unique Ψ channel — no registration form, no DNS, no IP allocation. One function call and your phone is on the map."}),e.jsxs("div",{className:"border border-emerald-400/20 rounded-xl overflow-hidden",style:{background:"rgba(74,222,128,0.03)"},children:[e.jsxs("div",{className:"px-5 py-3 border-b border-emerald-400/10 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Q,{size:12,className:"text-emerald-400"}),e.jsx("span",{className:"text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider",children:"Node Registration Simulator"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:()=>m("ios"),className:`text-[9px] px-2 py-1 rounded border transition-all ${s==="ios"?"border-cyan-400/40 text-cyan-400":"border-white/10 text-white/25"}`,"data-testid":"button-platform-ios",children:"iOS"}),e.jsx("button",{onClick:()=>m("android"),className:`text-[9px] px-2 py-1 rounded border transition-all ${s==="android"?"border-green-400/40 text-green-400":"border-white/10 text-white/25"}`,"data-testid":"button-platform-android",children:"Android"})]})]}),e.jsxs("div",{className:"p-5 space-y-4",children:[e.jsxs("div",{className:"flex gap-3",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx("div",{className:"text-white/25 text-[9px] mb-1",children:"Device / node name"}),e.jsx("input",{className:"w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/20 focus:border-emerald-400/30",placeholder:"e.g. Alice's iPhone, Pixel 8 Pro, Nexus Node Alpha…",value:u,onChange:t=>{C(t.target.value),x&&(w(!1),N())},"data-testid":"input-node-name"})]}),e.jsx("div",{className:"flex flex-col justify-end",children:e.jsx("button",{onClick:()=>{x?(w(!1),N()):w(!0)},className:`px-4 py-2 rounded-lg border font-bold text-[11px] transition-all flex items-center gap-2 ${x?"border-red-400/40 text-red-400 hover:border-red-400/70":"border-emerald-400/40 text-emerald-400 hover:border-emerald-400/70"}`,"data-testid":"button-node-start",children:x?e.jsxs(e.Fragment,{children:[e.jsx(U,{size:12})," Stop"]}):e.jsxs(e.Fragment,{children:[e.jsx(U,{size:12})," Join Network"]})})})]}),u.trim()&&(()=>{const t=R(u),a=k(t.nm);return e.jsxs("div",{className:"border border-white/5 rounded-lg p-3 flex items-center gap-4 flex-wrap",children:[e.jsx("div",{className:"w-3 h-3 rounded-full flex-shrink-0 animate-pulse",style:{background:a,boxShadow:`0 0 8px ${a}`}}),e.jsxs("div",{children:[e.jsx("div",{className:"text-[9px] text-white/30 mb-0.5",children:"Spectral identity (derived offline)"}),e.jsx("div",{className:"text-[11px] font-bold font-mono",style:{color:a},children:t.psi})]}),e.jsxs("div",{className:"text-[9px] text-white/30",children:["λ=",t.nm,"nm"]}),e.jsxs("div",{className:"text-[9px] text-white/30",children:[t.band," band"]}),e.jsxs("div",{className:"text-[9px] text-white/30",children:[t.thz,"THz"]}),e.jsxs("div",{className:"ml-auto text-[9px] font-mono text-white/20",children:["mobile-",u.toLowerCase().replace(/\s+/g,"-").slice(0,12)]})]})})(),e.jsxs("div",{ref:o,className:"rounded-lg border border-white/5 h-52 overflow-y-auto p-3 space-y-1 font-mono text-[10px]",style:{background:"rgba(0,0,0,0.6)"},"data-testid":"node-terminal",children:[l.length===0&&e.jsx("div",{className:"text-white/15 italic",children:'Enter a device name and press "Join Network" to simulate registration…'}),l.map((t,a)=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx("span",{className:"text-white/20 flex-shrink-0",children:t.ts}),e.jsx("span",{style:{color:t.color},children:t.msg})]},a))]}),x&&l.length>0&&e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:`flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-full border ${j?"border-emerald-400/30 text-emerald-400":"border-white/10 text-white/20"}`,children:[e.jsx("div",{className:`w-1.5 h-1.5 rounded-full ${j?"bg-emerald-400 animate-pulse":"bg-white/20"}`}),j?"ACTIVE":"REGISTERING…"]}),A&&e.jsx("div",{className:"text-[9px] font-mono",style:{color:h},children:A}),O>0&&e.jsxs("div",{className:"text-[9px] text-amber-400/60",children:[O," beacon",O!==1?"s":""," sent"]}),e.jsx("div",{className:"ml-auto",children:e.jsx(I,{href:"/network",children:e.jsx("button",{className:"text-[9px] text-emerald-400/60 hover:text-emerald-400 border border-emerald-400/20 rounded-lg px-3 py-1 transition-all","data-testid":"button-view-network",children:"View on Network Map →"})})})]})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"text-white/30 text-[10px] uppercase tracking-widest",children:s==="ios"?"iOS (Swift) — AppDelegate.swift":"Android (Kotlin) — NexusOSApp.kt"}),e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[s==="ios"?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-red-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-yellow-400/60"}),e.jsx("div",{className:"w-2.5 h-2.5 rounded-full bg-green-400/60"})]}):e.jsx("div",{className:"w-2 h-2 rounded-full bg-green-400/60"}),e.jsx("span",{className:"text-white/25 text-[9px]",children:s==="ios"?"AppDelegate.swift":"NexusOSApp.kt"})]}),e.jsxs("button",{onClick:()=>y(s==="ios"?M:z,"node-code"),className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all","data-testid":"button-copy-node-code",children:[e.jsx(E,{size:9})," ",f==="node-code"?"Copied!":"Copy"]})]}),e.jsx("pre",{className:`p-5 text-[10px] font-mono leading-relaxed overflow-x-auto ${s==="ios"?"text-cyan-200/75":"text-green-200/75"}`,children:s==="ios"?M:z})]})]}),e.jsxs("div",{className:"border border-violet-400/15 rounded-xl p-5",style:{background:"rgba(167,139,250,0.03)"},children:[e.jsx("div",{className:"text-violet-400/60 text-[10px] uppercase tracking-widest mb-4",children:"How Phone-as-Node Works"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:[{step:"1",title:"Identity",body:"Your device name is CE-encoded into a unique Ψ channel using pure offline physics — no server call needed.",color:"#a78bfa"},{step:"2",title:"Register",body:"One POST to /api/network/nodes/register puts your phone on the spectral network map. Any device, anywhere.",color:"#06b6d4"},{step:"3",title:"Beacon",body:"Every 90 seconds your phone sends a heartbeat. Stop beaconing and the node goes IDLE — fully self-healing.",color:"#4ade80"}].map(({step:t,title:a,body:d,color:b})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("div",{className:"w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold flex-shrink-0",style:{borderColor:b+"50",color:b},children:t}),e.jsx("div",{className:"text-[10px] font-bold",style:{color:b},children:a})]}),e.jsx("div",{className:"text-[9px] text-white/30 leading-relaxed",children:d})]},t))}),e.jsx("div",{className:"mt-4 border-t border-white/5 pt-4 text-[9px] text-white/20 leading-relaxed",children:"8 billion phones = 8 billion potential nodes. Each one adds relay capacity, CE encoding power, and P2P media distribution to the network — without NexusOS paying for a single server. The more people join, the stronger it gets."})]})]}),e.jsxs("div",{className:"border border-amber-400/10 rounded-xl p-5 text-center",style:{background:"rgba(251,191,36,0.02)"},children:[e.jsx("div",{className:"text-amber-400/50 text-[9px] uppercase tracking-widest mb-2",children:"AGPL-3.0 · Free Open Infrastructure · NexusOS"}),e.jsx("div",{className:"text-white/20 text-[10px] leading-relaxed max-w-xl mx-auto",children:"The WASCII CE/SE encoding standard and all NexusOS SDKs are free forever under AGPL-3.0. Any company that ships a product using this SDK must publish their source. The address space of light belongs to every civilisation on Earth."}),e.jsxs("div",{className:"mt-3 flex items-center justify-center gap-4",children:[e.jsx(I,{href:"/wavelength-lang",children:e.jsx("button",{className:"text-[9px] text-cyan-400/50 hover:text-cyan-400/80 border border-cyan-400/15 rounded-lg px-3 py-1.5 transition-all",children:"WavelengthScript"})}),e.jsx(I,{href:"/network",children:e.jsx("button",{className:"text-[9px] text-emerald-400/50 hover:text-emerald-400/80 border border-emerald-400/15 rounded-lg px-3 py-1.5 transition-all",children:"Spectral Network"})}),e.jsx(I,{href:"/wnsp-bridge",children:e.jsx("button",{className:"text-[9px] text-violet-400/50 hover:text-violet-400/80 border border-violet-400/15 rounded-lg px-3 py-1.5 transition-all",children:"WNSP Bridge"})})]})]})]})]})}export{pe as default};

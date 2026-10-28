"""Real gateway contracts with persistence and watchdog isolated from live data."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class SpectralGatewayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from wnsp_v7 import kernel_persistence as persistence
        from wnsp_v7.kernel_watchdog import KernelWatchdog
        cls.patches = [
            patch.object(persistence, "_connect", side_effect=AssertionError("No real database access allowed")),
            patch.object(persistence, "bootstrap_schema"),
            patch.object(persistence, "load_all_agents", return_value=[]),
            patch.object(persistence, "save_agent"),
            patch.object(persistence, "log_kernel_event"),
            patch.object(KernelWatchdog, "start"),
            patch("wnsp_v7.kernel_boot.threading.Thread.start"),
        ]
        for p in cls.patches:
            p.start()
        import spectral_api
        cls.api = spectral_api
        cls.client = spectral_api.app.test_client()
        cls.persistence = persistence

    @classmethod
    def tearDownClass(cls):
        for p in reversed(cls.patches):
            p.stop()

    def test_health_contract(self):
        response = self.client.get("/api/spectral/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["service"], "Spectral API")

    def test_real_encoder_not_placeholder(self):
        response = self.client.post("/api/spectral/encode", json={
            "content": "Gateway fixture", "sender": "fixture-a", "recipient": "fixture-b",
            "intensity": 32, "cycles": 1,
        })
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json, dict)
        self.assertGreater(response.json["efficiency"]["particles"], 0)
        self.assertEqual(response.json["efficiency"]["characters"], len("Gateway fixture"))

    def test_browser_text_contract_matches_legacy_content(self):
        for field in ("text", "content"):
            response = self.client.post("/api/spectral/encode", json={field: "你好 fixture"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["efficiency"]["characters"], len("你好 fixture"))

    def test_nexus_dev_encode_uses_real_gateway_encoder(self):
        response = self.client.post("/api/nexus/dev/encode", json={
            "instruction": "print('Gateway fixture')", "label": "gateway-contract",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "encoded")
        self.assertEqual(response.json["label"], "gateway-contract")
        self.assertEqual(response.json["instruction"], "print('Gateway fixture')")
        self.assertFalse(response.json["truncated"])
        self.assertGreater(len(response.json["frames"]), 0)
        self.persistence._connect.assert_not_called()

    def test_invalid_or_conflicting_content_is_rejected(self):
        for body in ({}, {"text": ""}, {"text": 2}, {"text": "x" * 10001},
                     {"text": "a", "content": "b"}, ["not an object"]):
            response = self.client.post("/api/spectral/encode", json=body)
            self.assertEqual(response.status_code, 400)

    def test_bus_contains_actual_core_agents_and_queue(self):
        response = self.client.get("/api/wnsp/bus/status")
        self.assertEqual(response.status_code, 200)
        self.assertIn("queue", response.json)
        self.assertIn("route_log", response.json)
        self.assertGreater(len(self.api._coordinator._registry), 0)

    def test_startup_does_not_access_real_database(self):
        self.persistence._connect.assert_not_called()
        self.persistence.bootstrap_schema.assert_called_once()
        self.persistence.load_all_agents.assert_called_once()


if __name__ == "__main__":
    unittest.main()

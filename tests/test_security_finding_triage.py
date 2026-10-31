"""Keep the reviewed energy-output finding confined to a synthetic demo."""
import ast
import unittest
from pathlib import Path


class PhysicsDemoPrivacyBoundary(unittest.TestCase):
    def test_energy_budget_output_stays_in_fixed_input_standalone_demo(self):
        module = ast.parse(
            (Path(__file__).resolve().parents[1] / "wnsp_v7/protocol.py").read_text()
        )
        main = [
            node for node in module.body
            if isinstance(node, ast.If)
            and ast.dump(node.test) == ast.dump(
                ast.parse('__name__ == "__main__"', mode="eval").body
            )
        ]
        self.assertEqual(len(main), 1)
        demo_nodes = {id(node) for node in ast.walk(main[0])}
        energy_prints = [
            node for node in ast.walk(module)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name) and node.func.id == "print"
            and any(
                isinstance(part, ast.Attribute) and part.attr == "energy_budget"
                for part in ast.walk(node)
            )
        ]
        self.assertTrue(energy_prints)
        self.assertTrue(all(id(node) in demo_nodes for node in energy_prints))
        packet_assignments = [
            node for node in ast.walk(main[0])
            if isinstance(node, ast.Assign)
            and any(isinstance(t, ast.Name) and t.id == "packet" for t in node.targets)
        ]
        self.assertEqual(len(packet_assignments), 1)
        call = packet_assignments[0].value
        self.assertIsInstance(call, ast.Call)
        self.assertIsInstance(call.func, ast.Attribute)
        self.assertEqual(call.func.attr, "create_packet")
        budgets = [kw.value for kw in call.keywords if kw.arg == "energy_budget"]
        self.assertEqual(len(budgets), 1)
        self.assertIsInstance(budgets[0], ast.Constant)
        self.assertEqual(budgets[0].value, 1e-5)


if __name__ == "__main__":
    unittest.main()

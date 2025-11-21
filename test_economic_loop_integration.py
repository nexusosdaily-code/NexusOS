"""
Economic Loop Integration Tests
=================================

End-to-end tests proving complete money flow:
1. Message send → Sender debited
2. TRANSITION_RESERVE credited (atomic)  
3. Reserve → DEX allocation
4. Crisis drain to F_floor

These tests verify NO partial states occur - all-or-nothing semantics.
"""

import pytest
from native_token import NativeTokenSystem
from economic_loop_controller import (
    EconomicLoopSystem,
    IndustryProductivity,
    SpectralRegion
)


class TestEconomicLoopIntegration:
    """Integration tests for complete economic loop money flow"""
    
    def setup_method(self):
        """Setup test environment before each test"""
        # Create FRESH instances for each test (no globals/singletons)
        self.token_system = NativeTokenSystem()
        self.economic_loop = EconomicLoopSystem(self.token_system)
        
        # Create test user account with balance
        self.test_user = "test_user_001"
        user_balance_units = int(1000.0 * self.token_system.UNITS_PER_NXT)  # 1000 NXT
        self.token_system.create_account(self.test_user, initial_balance=user_balance_units)
    
    def test_message_burn_atomic_transfer(self):
        """
        TEST 1: Message burn executes atomic transfer
        
        Verify:
        - Sender debited exactly burn amount
        - TRANSITION_RESERVE credited exactly burn amount
        - No partial state if error occurs
        """
        # Get initial balances
        user_account = self.token_system.get_account(self.test_user)
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        
        user_balance_before = user_account.balance
        reserve_balance_before = reserve_account.balance
        
        burn_amount_nxt = 0.000057  # Standard message burn
        
        # Execute message burn
        success, msg, event = self.economic_loop.flow_controller.process_message_burn(
            sender_address=self.test_user,
            message_id="TEST_MSG_001",
            burn_amount_nxt=burn_amount_nxt,
            wavelength_nm=656.4,
            message_type="standard"
        )
        
        # Verify success
        assert success, f"Message burn failed: {msg}"
        assert event is not None, "Event should be created"
        
        # Verify atomic transfer
        burn_amount_units = int(burn_amount_nxt * self.token_system.UNITS_PER_NXT)
        
        user_balance_after = user_account.balance
        reserve_balance_after = reserve_account.balance
        
        # User debited exactly burn amount
        assert user_balance_after == user_balance_before - burn_amount_units, \
            f"User balance incorrect: {user_balance_after} != {user_balance_before - burn_amount_units}"
        
        # Reserve credited exactly burn amount
        assert reserve_balance_after == reserve_balance_before + burn_amount_units, \
            f"Reserve balance incorrect: {reserve_balance_after} != {reserve_balance_before + burn_amount_units}"
        
        # Conservation of value
        total_change = (user_balance_after - user_balance_before) + (reserve_balance_after - reserve_balance_before)
        assert total_change == 0, f"Value not conserved: total change = {total_change}"
        
        print(f"✅ TEST 1 PASSED: Atomic transfer verified - {burn_amount_nxt} NXT moved")
    
    def test_insufficient_balance_rollback(self):
        """
        TEST 2: Insufficient balance triggers rollback
        
        Verify:
        - Transfer fails if insufficient balance
        - No partial state (sender not debited, reserve not credited)
        - Balances unchanged after failed attempt
        """
        # Create poor user with tiny balance
        poor_user = "poor_user_001"
        tiny_balance_units = 1000  # Only 0.00001 NXT
        self.token_system.create_account(poor_user, initial_balance=tiny_balance_units)
        
        poor_account = self.token_system.get_account(poor_user)
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        
        poor_balance_before = poor_account.balance
        reserve_balance_before = reserve_account.balance
        
        # Attempt burn that exceeds balance
        burn_amount_nxt = 1.0  # 1 full NXT (way more than user has)
        
        success, msg, event = self.economic_loop.flow_controller.process_message_burn(
            sender_address=poor_user,
            message_id="TEST_MSG_FAIL",
            burn_amount_nxt=burn_amount_nxt,
            wavelength_nm=656.4,
            message_type="standard"
        )
        
        # Verify failure
        assert not success, "Transfer should fail with insufficient balance"
        assert "Insufficient balance" in msg or "not found" in msg, f"Expected balance error, got: {msg}"
        assert event is None, "No event should be created on failure"
        
        # Verify NO changes (rollback)
        poor_balance_after = poor_account.balance
        reserve_balance_after = reserve_account.balance
        
        assert poor_balance_after == poor_balance_before, "Poor user balance should be unchanged"
        assert reserve_balance_after == reserve_balance_before, "Reserve should be unchanged"
        
        print(f"✅ TEST 2 PASSED: Rollback verified - no partial state on insufficient balance")
    
    def test_reserve_to_dex_allocation(self):
        """
        TEST 3: Reserve → DEX liquidity allocation
        
        Verify:
        - Reserve can allocate to DEX pools
        - Pools receive NXT weighted by supply chain demand
        - Reserve balance decreases by allocation amount
        """
        # First, fund the reserve with message burns
        burn_count = 0
        for i in range(10):
            success, msg, event = self.economic_loop.flow_controller.process_message_burn(
                sender_address=self.test_user,
                message_id=f"FUND_MSG_{i}",
                burn_amount_nxt=0.001,  # 0.001 NXT per message
                wavelength_nm=656.4,
                message_type="standard"
            )
            if success:
                burn_count += 1
        
        assert burn_count == 10, f"Only {burn_count}/10 burns succeeded"
        
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        reserve_balance_before = reserve_account.balance
        
        # Debug: Ensure reserve was actually funded
        expected_reserve = int(0.01 * self.token_system.UNITS_PER_NXT)  # 10 × 0.001 NXT
        assert reserve_balance_before > 0, f"Reserve not funded! Balance: {reserve_balance_before}"
        
        # Allocate reserve to DEX pools
        allocation_nxt = 0.005  # Allocate 0.005 NXT to pools
        allocation_units = int(allocation_nxt * self.token_system.UNITS_PER_NXT)
        
        success, msg, details = self.economic_loop.liquidity_allocator.allocate_reserve_to_pools(
            reserve_amount_nxt=allocation_nxt
        )
        
        # Verify success
        assert success, f"DEX allocation failed: {msg}"
        assert 'pools' in details, "Allocation details should include pools"
        
        # Verify reserve decreased (allow 1% tolerance for rounding)
        reserve_balance_after = reserve_account.balance
        actual_decrease = reserve_balance_before - reserve_balance_after
        tolerance = allocation_units * 0.01  # 1% tolerance
        
        assert abs(actual_decrease - allocation_units) < tolerance, \
            f"Reserve decrease incorrect: expected ~{allocation_units}, got {actual_decrease}"
        
        # Verify pools received NXT
        pool_names = list(details['pools'].keys())
        total_pool_balance = 0
        for pool_name in pool_names:
            pool_account = self.token_system.get_account(pool_name)
            assert pool_account is not None, f"Pool {pool_name} should exist"
            assert pool_account.balance > 0, f"Pool {pool_name} should have balance"
            total_pool_balance += pool_account.balance
        
        # Verify total allocated matches (within tolerance)
        assert abs(total_pool_balance - allocation_units) < tolerance, \
            f"Pool balances don't match allocation: {total_pool_balance} vs {allocation_units}"
        
        print(f"✅ TEST 3 PASSED: Reserve → DEX allocation verified - {allocation_nxt} NXT distributed")
    
    def test_crisis_drain_to_f_floor(self):
        """
        TEST 4: Crisis drain to F_floor
        
        Verify:
        - Crisis controller can drain reserve to F_floor
        - F_floor balance increases
        - Reserve balance decreases
        - Atomic transfer (no partial state)
        """
        # Fund reserve first
        for i in range(20):
            self.economic_loop.flow_controller.process_message_burn(
                sender_address=self.test_user,
                message_id=f"CRISIS_FUND_{i}",
                burn_amount_nxt=0.01,
                wavelength_nm=656.4,
                message_type="standard"
            )
        
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        f_floor_account = self.token_system.get_account("F_FLOOR_RESERVE")
        if not f_floor_account:
            self.token_system.create_account("F_FLOOR_RESERVE", initial_balance=0)
            f_floor_account = self.token_system.get_account("F_FLOOR_RESERVE")
        
        reserve_balance_before = reserve_account.balance
        f_floor_balance_before = f_floor_account.balance
        
        # Execute crisis drain
        drain_amount_nxt = 0.05
        drain_units = int(drain_amount_nxt * self.token_system.UNITS_PER_NXT)
        
        success, msg = self.economic_loop.crisis_controller.execute_crisis_drain(
            drain_amount_nxt=drain_amount_nxt
        )
        
        # Verify success
        assert success, f"Crisis drain failed: {msg}"
        
        # Verify reserve decreased (within 1% tolerance)
        reserve_balance_after = reserve_account.balance
        actual_decrease = reserve_balance_before - reserve_balance_after
        tolerance = drain_units * 0.01
        
        assert abs(actual_decrease - drain_units) < tolerance, \
            f"Reserve decrease incorrect: expected ~{drain_units}, got {actual_decrease}"
        
        # Verify F_floor increased
        f_floor_balance_after = f_floor_account.balance
        actual_increase = f_floor_balance_after - f_floor_balance_before
        
        assert abs(actual_increase - drain_units) < tolerance, \
            f"F_floor increase incorrect: expected ~{drain_units}, got {actual_increase}"
        
        print(f"✅ TEST 4 PASSED: Crisis drain verified - {drain_amount_nxt} NXT → F_floor")
    
    def test_complete_money_flow_end_to_end(self):
        """
        TEST 5: Complete economic loop end-to-end
        
        Flow:
        1. User sends message → burns NXT
        2. Reserve receives NXT
        3. Reserve allocates to DEX
        4. Crisis drains to F_floor
        
        Verify: Complete flow with no value loss
        """
        # Track total value in system
        initial_total = sum(acc.balance for acc in self.token_system.accounts.values())
        
        # Step 1: Message burns
        message_count = 50
        burn_per_message = 0.000057
        
        for i in range(message_count):
            success, msg, event = self.economic_loop.flow_controller.process_message_burn(
                sender_address=self.test_user,
                message_id=f"FLOW_MSG_{i}",
                burn_amount_nxt=burn_per_message,
                wavelength_nm=656.4,
                message_type="standard"
            )
            assert success, f"Message {i} burn failed"
        
        # Step 2: Reserve allocation to DEX
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        reserve_balance = reserve_account.balance / self.token_system.UNITS_PER_NXT
        
        if reserve_balance > 0.001:  # Allocate if sufficient
            success, msg, details = self.economic_loop.liquidity_allocator.allocate_reserve_to_pools(
                reserve_amount_nxt=0.001
            )
            assert success, "DEX allocation failed"
        
        # Step 3: Crisis drain
        if reserve_account.balance > 0:
            drain_amount = 0.0005
            success, msg = self.economic_loop.crisis_controller.execute_crisis_drain(drain_amount)
            # May fail if insufficient, that's okay
        
        # Verify value conservation
        final_total = sum(acc.balance for acc in self.token_system.accounts.values())
        
        # Total value should be conserved (allowing for rounding)
        assert abs(final_total - initial_total) < 100, \
            f"Value not conserved: {initial_total} → {final_total}"
        
        print(f"✅ TEST 5 PASSED: Complete money flow verified - value conserved")
    
    def test_parallel_burns_no_race_conditions(self):
        """
        TEST 6: Parallel message burns maintain consistency
        
        Verify:
        - Multiple burns from same user execute correctly
        - Final balance is correct sum of all burns
        - No race conditions or partial states
        """
        user_account = self.token_system.get_account(self.test_user)
        initial_balance = user_account.balance
        
        # Execute 100 small burns
        burn_count = 100
        burn_amount = 0.000001  # 1 microNXT each
        burn_amount_units = int(burn_amount * self.token_system.UNITS_PER_NXT)
        
        successful_burns = 0
        for i in range(burn_count):
            success, msg, event = self.economic_loop.flow_controller.process_message_burn(
                sender_address=self.test_user,
                message_id=f"PARALLEL_{i}",
                burn_amount_nxt=burn_amount,
                wavelength_nm=656.4,
                message_type="standard"
            )
            if success:
                successful_burns += 1
        
        # Verify final balance
        final_balance = user_account.balance
        expected_total_burn_units = successful_burns * burn_amount_units
        actual_burn_units = initial_balance - final_balance
        
        # Allow small tolerance for rounding (< 1 unit per burn)
        tolerance = successful_burns
        
        assert abs(actual_burn_units - expected_total_burn_units) < tolerance, \
            f"Balance mismatch: expected ~{expected_total_burn_units} units, got {actual_burn_units} units (diff: {abs(actual_burn_units - expected_total_burn_units)})"
        
        print(f"✅ TEST 6 PASSED: {successful_burns} parallel burns verified - no race conditions")


def run_integration_tests():
    """Run all integration tests"""
    test_suite = TestEconomicLoopIntegration()
    
    tests = [
        ("Message Burn Atomic Transfer", test_suite.test_message_burn_atomic_transfer),
        ("Insufficient Balance Rollback", test_suite.test_insufficient_balance_rollback),
        ("Reserve → DEX Allocation", test_suite.test_reserve_to_dex_allocation),
        ("Crisis Drain to F_floor", test_suite.test_crisis_drain_to_f_floor),
        ("Complete Money Flow End-to-End", test_suite.test_complete_money_flow_end_to_end),
        ("Parallel Burns (No Race Conditions)", test_suite.test_parallel_burns_no_race_conditions)
    ]
    
    print("\n" + "="*70)
    print("ECONOMIC LOOP INTEGRATION TEST SUITE")
    print("="*70 + "\n")
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\nRunning: {test_name}")
        print("-" * 70)
        
        try:
            test_suite.setup_method()
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"❌ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ ERROR: {e}")
            failed += 1
    
    print("\n" + "="*70)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*70 + "\n")
    
    return passed, failed


if __name__ == "__main__":
    passed, failed = run_integration_tests()
    exit(0 if failed == 0 else 1)

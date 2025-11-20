from civilization_simulator import CivilizationSimulator

# Create simulator
sim = CivilizationSimulator(initial_population=10000)

# Run 1 year simulation
print('Running 1-year simulation with debt backing...')
sim.simulate_years(1)

# Check final state
final = sim.current_state
debt_ratio = final.nxt_debt_backing_ratio()

print(f'\n=== Final State ===')
print(f'Global Debt: ${final.global_debt_usd/1e12:.2f}T USD')
print(f'NXT Supply: {final.nxt_supply:,.0f} NXT')

# Display debt-per-NXT with adaptive precision
if debt_ratio >= 1:
    debt_display = f"${debt_ratio:,.2f}"
elif debt_ratio >= 0.001:
    debt_display = f"${debt_ratio:.4f}"
else:
    debt_display = f"${debt_ratio:.2e}"

print(f'Debt per NXT: {debt_display} USD')
print(f'Daily Debt-Backed Floor Credits: {final.debt_backed_floor_credits:,.2f} NXT')
print(f'BHLS Floor Reserve: {final.bhls_floor_reserve:,.0f} NXT')
print(f'Stability: {final.stability_index:.2%}')

print(f'\n=== Debt Backing Analysis ===')
print(f'With ${final.global_debt_usd/1e12:.2f}T debt backing {final.nxt_supply:,.0f} NXT,')
print(f'each NXT represents {debt_display} in debt value.')
print(f'This flows {final.debt_backed_floor_credits:,.2f} NXT/day to the BHLS floor.')

print(f'\n=== Formula Verification ===')
expected_credits = final.population * debt_ratio * 0.01 * 0.01
print(f'Expected credits (formula): {expected_credits:,.2f} NXT/day')
print(f'Actual credits: {final.debt_backed_floor_credits:,.2f} NXT/day')
match = abs(expected_credits - final.debt_backed_floor_credits) < 0.01
print(f'Formula match: {match} ✓' if match else f'Formula match: {match} ✗')

# Assertions for regression testing
print(f'\n=== Regression Tests ===')
assert debt_ratio > 0, "FAIL: Debt-per-NXT ratio must be positive"
print(f'✓ PASS: Debt ratio positive ({debt_ratio:.4f} > 0)')

assert final.debt_backed_floor_credits > 0, "FAIL: Floor credits must be positive"
print(f'✓ PASS: Floor credits positive ({final.debt_backed_floor_credits:.4f} > 0)')

assert match, "FAIL: Formula does not match actual credits"
print(f'✓ PASS: Formula matches implementation')

print(f'\nAll regression tests passed! ✓')

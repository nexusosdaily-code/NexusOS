def fixedRound(numerator, denominator):
    if denominator < 0:
        numerator = -numerator
        denominator = -denominator
    sign = 1
    if numerator < 0:
        sign = -1
        numerator = -numerator
    quotient = numerator // denominator
    remainder = numerator % denominator
    if remainder * 2 >= denominator:
        quotient = quotient + 1
    return sign * quotient

def fixedAdd(left, right):
    return left + right

def fixedSubtract(left, right):
    return left - right

def fixedMultiply(left, right):
    return fixedRound(left * right, 1000)

def fixedDivide(left, right):
    return fixedRound(left * 1000, right)

def fixedDotStep(total, left, right):
    return total + left * right

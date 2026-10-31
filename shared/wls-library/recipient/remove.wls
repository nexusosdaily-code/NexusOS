WLS-COLLECTION/1
LIST_NEW ["result"]
LIST_LEN ["size","items"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","next"]
LIST_PUSH ["result","item"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

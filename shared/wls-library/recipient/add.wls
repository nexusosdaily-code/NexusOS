WLS-COLLECTION/1
LIST_LEN ["size","items"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
LIST_COPY ["result","items"]
LIST_PUSH ["result","value"]
RETURN ["result"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","existing"]
INC ["index"]
JUMP ["scan"]
:existing
RETURN ["items"]

WLS-COLLECTION/1
LIST_NEW ["needle"]
LIST_PUSH ["needle","value"]
LIST_LEN ["size","items"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
CONST ["missing",-1]
RETURN ["missing"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","found"]
INC ["index"]
JUMP ["scan"]
:found
RETURN ["index"]

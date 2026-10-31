WLS-COLLECTION/1
LIST_NEW ["needle"]
LIST_PUSH ["needle","value"]
LIST_NEW ["visited"]
LIST_LEN ["size","items"]
CONST ["index",0]
CONST ["result",-1]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","remember"]
:next
LIST_PUSH ["visited","item"]
INC ["index"]
JUMP ["scan"]
:remember
LIST_LEN ["result","visited"]
JUMP ["next"]
RETURN ["result"]

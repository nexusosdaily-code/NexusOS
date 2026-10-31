WLS-COLLECTION/1
LIST_COPY ["result","left"]
LIST_LEN ["size","right"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","append"]
RETURN ["result"]
:append
LIST_AT ["item","right","index"]
LIST_PUSH ["result","item"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

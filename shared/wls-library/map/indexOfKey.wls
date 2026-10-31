WLS-MAP/1
MAP_HAS ["ignored","map","key"]
MAP_SIZE ["size","map"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
CONST ["result",-1]
RETURN ["result"]
:check
MAP_KEY_AT ["item","map","index"]
EQ ["matches","item","key"]
JTRUE ["matches","found"]
INC ["index"]
JUMP ["scan"]
:found
RETURN ["index"]

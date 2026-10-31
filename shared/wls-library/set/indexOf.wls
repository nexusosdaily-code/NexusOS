WLS-MAP/1
MAP_HAS ["ignored","set","value"]
MAP_SIZE ["size","set"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
CONST ["result",-1]
RETURN ["result"]
:check
MAP_KEY_AT ["item","set","index"]
EQ ["matches","item","value"]
JTRUE ["matches","found"]
INC ["index"]
JUMP ["scan"]
:found
RETURN ["index"]

WLS-MAP/1
MAP_SIZE ["size","left"]
MAP_SIZE ["otherSize","right"]
CONST ["result",0]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["present","right","key"]
JTRUE ["present","values"]
JUMP ["next"]
:values
MAP_GET ["payload","left","key"]
MAP_GET ["otherPayload","right","key"]
EQ ["equal","payload","otherPayload"]
JTRUE ["equal","next"]
INC ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

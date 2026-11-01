WLS-MAP/1
MAP_SIZE ["size","left"]
MAP_SIZE ["valid","right"]
CONST ["result",0]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["present","right","key"]
JTRUE ["present","next"]
INC ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

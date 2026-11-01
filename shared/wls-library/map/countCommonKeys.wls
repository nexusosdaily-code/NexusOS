WLS-MAP/1
MAP_SIZE ["size","left"]
MAP_SIZE ["validated","right"]
CONST ["index",0]
CONST ["result",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["matches","right","key"]
JTRUE ["matches","count"]
JUMP ["next"]
:count
INC ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

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
MAP_HAS ["present","right","key"]
JTRUE ["present","compare"]
JUMP ["next"]
:compare
MAP_GET ["a","left","key"]
MAP_GET ["b","right","key"]
EQ ["matches","a","b"]
JTRUE ["matches","count"]
JUMP ["next"]
:count
INC ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

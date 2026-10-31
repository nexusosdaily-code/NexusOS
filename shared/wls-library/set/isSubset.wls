WLS-MAP/1
MAP_SIZE ["leftSize","left"]
MAP_SIZE ["rightSize","right"]
CONST ["result",true]
CONST ["index",0]
:scan
LT ["more","index","leftSize"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["found","right","key"]
JTRUE ["found","next"]
CONST ["result",false]
RETURN ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

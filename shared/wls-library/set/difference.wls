WLS-MAP/1
MAP_NEW ["result"]
CONST ["payload",""]
MAP_SIZE ["size","left"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["found","right","key"]
JTRUE ["found","next"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

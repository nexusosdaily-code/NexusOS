WLS-MAP/1
CONST ["key",""]
MAP_NEW ["result"]
MAP_SET ["result","result","key","value"]
MAP_NEW ["result"]
MAP_SIZE ["size","map"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
EQ ["matches","item","value"]
JTRUE ["matches","next"]
MAP_SET ["result","result","key","item"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["result"]
CONST ["empty",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
MAP_SET ["result","result","item","empty"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

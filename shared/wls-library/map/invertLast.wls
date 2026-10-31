WLS-MAP/1
MAP_NEW ["result"]
MAP_SIZE ["size","map"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","invert"]
RETURN ["result"]
:invert
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
MAP_SET ["result","result","item","key"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

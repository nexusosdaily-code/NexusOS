WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["holder"]
MAP_HAS ["ignored","holder","value"]
MAP_HAS ["ignored","holder","fallback"]
CONST ["slot","result"]
MAP_SET ["holder","holder","slot","fallback"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
MAP_GET ["result","holder","slot"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
EQ ["matches","item","value"]
JTRUE ["matches","remember"]
:next
INC ["index"]
JUMP ["scan"]
:remember
MAP_SET ["holder","holder","slot","key"]
JUMP ["next"]
RETURN ["slot"]

WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["ignored","probe","value"]
MAP_HAS ["ignored","probe","replacement"]
MAP_COPY ["result","map"]
CONST ["found",false]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
JTRUE ["found","replace"]
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
MAP_SET ["probe","probe","value","key"]
CONST ["found",true]
JUMP ["next"]
:replace
MAP_GET ["last","probe","value"]
MAP_SET ["result","result","last","replacement"]
RETURN ["result"]

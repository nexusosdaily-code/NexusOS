WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["ignored","probe","value"]
MAP_HAS ["ignored","probe","replacement"]
MAP_NEW ["result"]
CONST ["replaced",false]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
MAP_SET ["result","result","key","item"]
JTRUE ["replaced","next"]
EQ ["matches","item","value"]
JTRUE ["matches","replace"]
:next
INC ["index"]
JUMP ["scan"]
:replace
MAP_SET ["result","result","key","replacement"]
CONST ["replaced",true]
JUMP ["next"]
RETURN ["result"]

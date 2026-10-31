WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
CONST ["result",0]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
EQ ["matches","item","value"]
JTRUE ["matches","count"]
:next
INC ["index"]
JUMP ["scan"]
:count
INC ["result"]
JUMP ["next"]
RETURN ["result"]

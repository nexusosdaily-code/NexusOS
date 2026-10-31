WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
// Validate the string query even when the input Map is empty.
MAP_HAS ["valid","probe","value"]
CONST ["result",false]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
EQ ["matches","item","value"]
JTRUE ["matches","found"]
INC ["index"]
JUMP ["scan"]
:found
CONST ["result",true]
RETURN ["result"]

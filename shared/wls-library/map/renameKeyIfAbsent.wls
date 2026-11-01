WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_HAS ["source","map","key"]
MAP_HAS ["destination","map","replacement"]
MAP_NEW ["result"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["item","map","index"]
MAP_GET ["payload","map","item"]
JTRUE ["destination","keep"]
EQ ["matches","item","key"]
JTRUE ["matches","replace"]
:keep
MAP_SET ["result","result","item","payload"]
JUMP ["next"]
:replace
MAP_SET ["result","result","replacement","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

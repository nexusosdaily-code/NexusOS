WLS-MAP/1
MAP_SIZE ["size","set"]
MAP_HAS ["source","set","value"]
MAP_HAS ["destination","set","replacement"]
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["item","set","index"]
JTRUE ["destination","keep"]
EQ ["matches","item","value"]
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

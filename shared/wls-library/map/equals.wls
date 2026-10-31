WLS-MAP/1
MAP_SIZE ["leftSize","left"]
MAP_SIZE ["rightSize","right"]
EQ ["sameSize","leftSize","rightSize"]
JTRUE ["sameSize","begin"]
CONST ["result",false]
RETURN ["result"]
:begin
CONST ["result",true]
CONST ["index",0]
:scan
LT ["more","index","leftSize"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["found","right","key"]
JTRUE ["found","compare"]
JUMP ["mismatch"]
:compare
MAP_GET ["value","left","key"]
MAP_GET ["other","right","key"]
EQ ["matches","value","other"]
JTRUE ["matches","next"]
:mismatch
CONST ["result",false]
RETURN ["result"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]

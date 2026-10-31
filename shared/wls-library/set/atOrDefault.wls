WLS-MAP/1
MAP_SIZE ["size","set"]
CONST ["zero",0]
LT ["negative","index","zero"]
MAP_NEW ["probe"]
MAP_HAS ["ignored","probe","fallback"]
CONST ["slot","fallback"]
MAP_SET ["probe","probe","slot","fallback"]
MAP_GET ["result","probe","slot"]
JTRUE ["negative","done"]
LT ["inside","index","size"]
JTRUE ["inside","lookup"]
:done
RETURN ["result"]
:lookup
MAP_KEY_AT ["result","set","index"]
RETURN ["result"]

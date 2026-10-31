WLS-MAP/1
MAP_HAS ["found","map","key"]
MAP_NEW ["probe"]
MAP_SET ["probe","probe","key","value"]
JTRUE ["found","unchanged"]
MAP_SET ["result","map","key","value"]
RETURN ["result"]
:unchanged
MAP_COPY ["result","map"]
RETURN ["result"]

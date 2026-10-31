WLS-MAP/1
// Validate all required inputs, including a fallback that is not selected.
MAP_HAS ["found","map","key"]
MAP_NEW ["probe"]
MAP_SET ["probe","probe","key","fallback"]
JTRUE ["found","present"]
RETURN ["fallback"]
:present
MAP_GET ["result","map","key"]
RETURN ["result"]

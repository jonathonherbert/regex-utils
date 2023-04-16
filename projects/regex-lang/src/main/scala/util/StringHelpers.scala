package util

implicit class StringExtension(s: String) {
  implicit def safeSubstring(start: Int, end: Int = 0): String = {
    if (start < 0) {
      var realStart = s.length - Math.abs(start)
      var realEnd = end match {
        case 0 => s.length
        case e if e < 0 || e + realStart > s.length => s.length
        case _ => realStart + end
      }

      s.substring(realStart, realEnd)
    } else {
      s.substring(start, if (end > s.length) {s.length} else {end})
    }
  }
}

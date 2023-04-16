package regexlang

// For more information on writing tests, see
// https://scalameta.org/munit/docs/getting-started.html
class ScannerSpec extends munit.FunSuite {
  import TokenType._

  def strTok(str: String, pos: Int, ln: Int = 1) = Token(STRING, s"'$str'", str, pos, ln)
  def reservedTok(tokenType: TokenType, pos: Int, line: Int = 1) = Token(
    tokenType,
    Token.tokenToReservedWord.get(tokenType).getOrElse {
      throw new Error(s"No lexeme for $tokenType")
    },
    null,
    pos,
    line
  )

  test("empty program") {
    val input = ""
    val scanner = new Scanner(input)
    val result = scanner.scanTokens
    val expected = List(Token(EOF, pos = 0, line = 1))
    assertEquals(result, expected)
  }

  test("short program") {
    val input = "'zelensk' then ('y' or 'iy' or 'yy')"
    val scanner = new Scanner(input)
    val result = scanner.scanTokens
    val expected = List(
      Token(STRING, "'zelensk'", "zelensk", pos = 0, line = 1),
      reservedTok(THEN, pos = 10),
      Token(LEFT_PAREN, "(", pos = 15, line = 1),
      Token(STRING, "'y'", "y", pos = 16, line = 1),
      reservedTok(OR, pos = 20),
      Token(STRING, "'iy'", "iy", pos = 23, line = 1),
      reservedTok(OR, pos = 28),
      Token(STRING, "'yy'", "yy", pos = 31, line = 1),
      Token(RIGHT_PAREN, ")", pos = 35, line = 1),
      Token(EOF, pos = 36, line = 1)
    )
    assertEquals(result, expected)
  }
}

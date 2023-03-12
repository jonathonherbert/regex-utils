package regexlang

// For more information on writing tests, see
// https://scalameta.org/munit/docs/getting-started.html
class MySuite extends munit.FunSuite {
  import TokenType._

  def strTok(str: String, ln: Int = 1) = Token(STRING, s"'$str'", str, ln)
  def reservedTok(tokenType: TokenType) = Token(tokenType, Token.reservedWords.find {
    case (lexeme, maybeTokenType) => tokenType == maybeTokenType
  }.map {
    case (lexeme, _) => lexeme
  }.getOrElse {
    throw new Error(s"No lexeme for $tokenType")
  })

  test("empty program") {
    val input = ""
    val scanner = new Scanner(input)
    val result = scanner.scanTokens
    val expected = List(Token(EOF))
    assertEquals(result, expected)
  }

  test("short program") {
    val input = "'zelensk' then ('y' or 'iy' or 'yy')"
    val scanner = new Scanner(input)
    val result = scanner.scanTokens
    val expected = List(
      Token(STRING, "'zelensk'", "zelensk", 1),
      reservedTok(THEN),
      Token(LEFT_PAREN, "("),
      Token(STRING, "'y'", "y", 1),
      reservedTok(OR),
      Token(STRING, "'iy'", "iy", 1),
      reservedTok(OR),
      Token(STRING, "'yy'", "yy", 1),
      Token(RIGHT_PAREN, ")"),
      Token(EOF)
    )
    assertEquals(result, expected)
  }
}

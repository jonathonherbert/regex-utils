package regexlang

enum TokenType:
  // Single-character tokens.
  case LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

    // Keywords.
    MAYBE, OR, THEN,

    // Templates.
    WORD_BOUNDARY, WORD, LETTER, DIGIT, WHITESPACE,

    // Literals.
    CHAR, STRING, NUMBER,

    EOF

object Token:
  val reservedWords = Map(
    "word boundary" -> TokenType.WORD_BOUNDARY,
    "word" -> TokenType.WORD,
    "letter" -> TokenType.LETTER,
    "digit" -> TokenType.DIGIT,
    "or" -> TokenType.OR,
    "then" -> TokenType.THEN
  )

case class Token(
    tokenType: TokenType,
    lexeme: String = "",
    literal: Double | String | Null = null,
    line: Int = 1
):
  override def toString = s"${tokenType} ${lexeme} ${literal} ${line}"

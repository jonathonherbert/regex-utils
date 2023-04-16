package regexlang

enum TokenType:
  // Single-character tokens.
  case LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

    // Keywords.
    MAYBE, OR, THEN, GROUPED_AS,

    // Quantifiers.
    QUANT_ONE_OR_MORE,
    QUANT_ZERO_OR_MORE,
    QUANT_BETWEEN,
    QUANT_AND,
    QUANT_EXACT,
    QUANT_TIMES,

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
    "then" -> TokenType.THEN,
    "grouped as" -> TokenType.GROUPED_AS,
    "zero or more times" -> TokenType.QUANT_ZERO_OR_MORE,
    "one or more times" -> TokenType.QUANT_ONE_OR_MORE,
    "between" -> TokenType.QUANT_BETWEEN,
    "and" -> TokenType.QUANT_AND,
    "times" -> TokenType.QUANT_TIMES,
    "of" -> TokenType.QUANT_EXACT,
    "maybe" -> TokenType.MAYBE
  )

  val tokenToReservedWord = reservedWords.map(_.swap)

case class Token(
    tokenType: TokenType,
    lexeme: String = "",
    literal: Double | String | Null = null,
    pos: Int,
    line: Int,
):
  override def toString = s"${tokenType} ${lexeme} ${literal} ${line}"

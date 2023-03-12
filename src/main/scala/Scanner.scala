package regexlang

class Scanner(program: String):
  var tokens: List[Token] = List.empty
  var start = 0
  var current = 0
  var line = 1
  var hasError = false;

  def scanTokens: List[Token] =
    while (!isAtEnd) {
      // We are at the beginning of the next lexeme.
      start = current;
      scanToken
    }

    tokens :+ Token(TokenType.EOF, "", null, line)

  def isAtEnd = current == program.size

  def scanToken =
    advance match {
      case '(' => addToken(TokenType.LEFT_PAREN)
      case ')' => addToken(TokenType.RIGHT_PAREN)
      case '{' => addToken(TokenType.LEFT_BRACE)
      case '}' => addToken(TokenType.RIGHT_BRACE)
      case ',' => addToken(TokenType.COMMA)
      case '.' => addToken(TokenType.DOT)
      case '-' => addToken(TokenType.MINUS)
      case '+' => addToken(TokenType.PLUS)
      case ';' => addToken(TokenType.SEMICOLON)
      case '*' => addToken(TokenType.STAR)
      case '/' =>
        if (matchChar('*'))
          addCommentBlock
        else if (matchChar('/'))
          while (peek != '\n' && !isAtEnd) advance
        else
          addToken(TokenType.SLASH)
      case ' '  => ()
      case '\r' => ()
      case '\t' => ()
      case '\n' =>
        line = line + 1
      case '\''                   => addString
      case c if c.isDigit         => addNumber
      case c if c.isLetterOrDigit => addReservedWord
      case c                      => error(line, s"Unexpected token: ${c}")
    }

  def addNumber =
    while (peek.isDigit)
      advance
    if (peek == '.' && peekNext.isDigit)
      advance
      while (peek.isDigit) advance

    addToken(TokenType.NUMBER, program.substring(start, current).toDouble)

  def addString =
    while ((peek != '\'') && !isAtEnd)
      advance

    if (isAtEnd) error(line, "Unterminated string at end of file")
    else
      advance
      addToken(TokenType.STRING, program.substring(start + 1, current - 1))

  def addToken(tokenType: TokenType, literal: Double | String | Null = null) =
    val text = program.substring(start, current)
    tokens = tokens :+ Token(tokenType, text, literal, line)

  def addCommentBlock: Unit =
    while (!(peek == '*' && peekNext == '/') && !isAtEnd)
      // If we encounter another comment, consume that too
      if (peek == '/' && peekNext == '*')
        advance
        advance
        addCommentBlock
      if (peek == '\n')
        line = line + 1
      advance
    // Skip past the two remaining chars
    advance
    advance

  def addReservedWord =
    while (peek.isLetterOrDigit) advance
    val text = program.substring(start, current)
    Token.reservedWords.get(text.toLowerCase()) match {
      case Some(tokenType) => addToken(tokenType)
      case None => error(line, s"Expected the next part of the expression to be one of ${Token.reservedWords.values.mkString(", ")}")
    }

  def advance =
    val previous = current
    current = current + 1
    program(previous)

  def matchChar(expected: Char) =
    if (isAtEnd || program(current) != expected) false
    else
      current = current + 1
      true

  def peek = if (isAtEnd) '\u0000' else program(current)
  def peekNext =
    if (current + 1 >= program.size) '\u0000' else program.charAt(current + 1)

  def error(line: Int, message: String) = report(line, "", message)

  def report(line: Int, where: String, message: String) =
    println(s"[line ${line}] Error${where}: ${message}")
    hasError = true;

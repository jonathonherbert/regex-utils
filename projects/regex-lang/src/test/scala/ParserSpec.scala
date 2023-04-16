import regexlang._
import scala.util.Success

// For more information on writing tests, see
// https://scalameta.org/munit/docs/getting-started.html
class ParserSpec extends munit.FunSuite {
  def regexFromInput(input: String) = {
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(input, tokens)
    val result = parser.parse()
    result.map(_.toRegex()).get
  }

  test("empty program") {
    val input = ""
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(input, tokens)
    val result = parser.parse()

    val expected = Success(Expr(List.empty))
    assertEquals(result, expected)
  }

  test("conjunctions") {
    val input = "'this' or 'that'"
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(input, tokens)
    val result = parser.parse()
    val expected = Success(
      Expr(
        List(
          BaseExpr(
            expr = CompoundExpr(
              expr = BasicExpr(
                value = Literal(
                  value = "this"
                )
              ),
              prefix = None
            ),
            conjunction =
              Some(Conjunction(Token(TokenType.OR, "or", null, 7, 1)))
          ),
          BaseExpr(
            expr = CompoundExpr(
              expr = BasicExpr(
                value = Literal(
                  value = "that"
                )
              ),
              prefix = None
            )
          )
        )
      )
    )
    assertEquals(result, expected)

    val regex = result.map(_.toRegex()).get

    assertEquals(regex, "this|that")
  }

  test("short program") {
    val input = "'zelensk' then ('y' or 'iy' or 'yy')"
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(input, tokens)
    val result = parser.parse()

    val expected = Success(
      Expr(
        List(
          BaseExpr(
            expr = CompoundExpr(
              expr = BasicExpr(
                value = Literal(
                  value = "zelensk"
                )
              ),
              prefix = None,
              suffix = None
            ),
            conjunction = Some(
              value = Conjunction(
                token = Token(
                  tokenType = TokenType.THEN,
                  lexeme = "then",
                  literal = null,
                  pos = 10,
                  line = 1
                )
              )
            )
          ),
          BaseExpr(
            expr = CompoundExpr(
              expr = BasicExpr(
                value = GroupedExpr(
                  expr = Expr(
                    exprs = List(
                      BaseExpr(
                        expr = CompoundExpr(
                          expr = BasicExpr(
                            value = Literal(
                              value = "y"
                            )
                          ),
                          prefix = None,
                          suffix = None
                        ),
                        conjunction = Some(
                          value = Conjunction(
                            token = Token(
                              tokenType = TokenType.OR,
                              lexeme = "or",
                              literal = null,
                              pos = 20,
                              line = 1
                            )
                          )
                        )
                      ),
                      BaseExpr(
                        expr = CompoundExpr(
                          expr = BasicExpr(
                            value = Literal(
                              value = "iy"
                            )
                          ),
                          prefix = None,
                          suffix = None
                        ),
                        conjunction = Some(
                          value = Conjunction(
                            token = Token(
                              tokenType = TokenType.OR,
                              lexeme = "or",
                              literal = null,
                              pos = 28,
                              line = 1
                            )
                          )
                        )
                      ),
                      BaseExpr(
                        expr = CompoundExpr(
                          expr = BasicExpr(
                            value = Literal(
                              value = "yy"
                            )
                          ),
                          prefix = None,
                          suffix = None
                        ),
                        conjunction = None
                      )
                    )
                  ),
                  name = None
                )
              ),
              prefix = None,
              suffix = None
            ),
            conjunction = None
          )
        )
      )
    )

    assertEquals(result, expected)

    val regex = result.map(_.toRegex()).get

    assertEquals(regex, "zelensk(y|iy|yy)")
  }

  test("quantifiers - zero to many") {
    val result = regexFromInput("'a' zero or more times")
    val expected = "a*"
    assertEquals(result, expected)
  }

  test("quantifiers - one to many") {
    val result = regexFromInput("'a' one or more times")
    val expected = "a+"
    assertEquals(result, expected)
  }

  test("quantifiers - n to m") {
    val result = regexFromInput("'a' between 1 and 3 times")
    val expected = "a{1,3}"
    assertEquals(result, expected)
  }

  test("quantifiers - exactly n") {
    val result = regexFromInput("'a' between 1 and 3 times")
    val expected = "a{1,3}"
    assertEquals(result, expected)
  }

  test("quantifiers after groups") {
    val result =
      regexFromInput("('a' between 1 and 3 times) between 1 and 3 times")
    val expected = "(a{1,3}){1,3}"
    assertEquals(result, expected)
  }

  test("corpus - example 1") {
    val result =
      regexFromInput("word boundary then 'Is' then ('a' or 'o') then 'bel' then maybe ('le') then ' Huppert'")
    val expected = "\\bIs(a|o)bel(le)? Huppert"
    assertEquals(result, expected)
  }

  test("corpus - example 2") {
    val result =
      regexFromInput("word boundary then 'S' then maybe ('ain') then 't' then maybe '.' then ' John' then maybe (maybe '’' then 's') then ' Ambulance' then maybe (' Brigade')")
    val expected = "\\bS(ain)?t\\.? John(\\’?s)? Ambulance( Brigade)?"
    assertEquals(result, expected)
  }

  test("corpus - example 3") {
    val result = regexFromInput("'Camilla' then maybe ',' then ' ' then ('Parker' then maybe ' ' then maybe '-' then 'Bowles' or maybe 'the' then ' Queen Consort')")
    val expected = "Camilla,? (Parker ?-?Bowles|the? Queen Consort)"
    assertEquals(result, expected)
  }

  test("corpus - example 3, alternative version 1") {
    val result = regexFromInput("""
      'Camilla'
      then maybe ','
      then ' '
      then (
        'Parker'
        then maybe ' '
        then maybe '-'
        then 'Bowles'
        or maybe 'the'
        then ' Queen Consort'
      )""")
    val expected = "Camilla,? (Parker ?-?Bowles|the? Queen Consort)"
    assertEquals(result, expected)
  }

  test("named groups") {
    val result = regexFromInput("""
      ('a') grouped as 'test_group'""")
    val expected = "(?<test_group>a)"
    assertEquals(result, expected)
  }

  test("named groups followed by other expressions") {
    val result = regexFromInput("""
      ('a') grouped as 'test_group' then 'b'""")
    val expected = "(?<test_group>a)b"
    assertEquals(result, expected)
  }
}

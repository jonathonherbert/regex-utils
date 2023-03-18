import regexlang._
import scala.util.Success

// For more information on writing tests, see
// https://scalameta.org/munit/docs/getting-started.html
class ParserSpec extends munit.FunSuite {
  test("empty program") {
    val input = ""
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)
    val result = parser.parse()

    val expected = Success(List.empty)
    assertEquals(result, expected)
  }

  test("conjunctions") {
    val input = "'this' or 'that'"
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)
    val result = parser.parse()
    val expected = Success(
      List(
        BaseExpr(
          expr = CompoundExpr(
            expr = BasicExpr(
              expr = Literal(
                value = "this"
              )
            ),
            prefix = None,
            conjunction = Some(Conjunction(Token(TokenType.OR, "or", null, 1)))
          )
        ),
        BaseExpr(
          expr = CompoundExpr(
            expr = BasicExpr(
              expr = Literal(
                value = "that"
              )
            ),
            prefix = None,
            conjunction = None
          )
        )
      )
    )
    assertEquals(result, expected)
  }

  test("short program") {
    val input = "'zelensk' then ('y' or 'iy' or 'yy')"
    val scanner = new Scanner(input)
    val tokens = scanner.scanTokens
    val parser = new Parser(tokens)
    val result = parser.parse()

    val expected = Success(
      List(
        BaseExpr(
          expr = CompoundExpr(
            expr = BasicExpr(
              expr = Literal(
                value = "zelensk"
              )
            ),
            prefix = None,
            conjunction = Some(Conjunction(Token(TokenType.THEN, "then", null, 1)))
          )
        ),
        BaseExpr(
          expr = GroupedExpr(
            expr = List(
              BaseExpr(
                expr = CompoundExpr(
                  expr = BasicExpr(
                    expr = Literal(
                      value = "y"
                    )
                  ),
                  prefix = None,
                  conjunction =
                    Some(Conjunction(Token(TokenType.OR, "or", null, 1)))
                )
              ),
              BaseExpr(
                expr = CompoundExpr(
                  expr = BasicExpr(
                    expr = Literal(
                      value = "iy"
                    )
                  ),
                  prefix = None,
                  conjunction =
                    Some(Conjunction(Token(TokenType.OR, "or", null, 1)))
                )
              ),
              BaseExpr(
                expr = CompoundExpr(
                  expr = BasicExpr(
                    expr = Literal(
                      value = "yy"
                    )
                  ),
                  prefix = None,
                  conjunction = None
                )
              )
            ),
            name = None
          )
        )
      )
    )
    assertEquals(result, expected)
  }
}

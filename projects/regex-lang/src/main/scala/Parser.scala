package regexlang

import util._
import TokenType._
import scala.util.Try
import javax.naming.NameParser

class ParseError extends Exception


class Parser(progStr: String, tokens: List[Token]):
  var current: Int = 0;
  val debug = false
  var curDepth = 0
  val maxDepth = 1000
  val skipTypes = List.empty

  def parse(): Try[Expr] =
    if (debug) {
      println(tokens.map(t => s"(${t.tokenType}, ${t.literal})").mkString(", "))
    }
    Try { regex }

  private def regex = log("regex = expr*") {
    var exprs = List.empty[BaseExpr]
    while (peek().tokenType != EOF && peek().tokenType != RIGHT_PAREN) {
      exprs = exprs :+ baseExpr
    }
    Expr(exprs)
  }

  private def baseExpr: BaseExpr =
    log("expr = compound_expr (conjunction? expr)") {
        BaseExpr(compoundExpr, conjunction)
    }

  private def basicExpr: Option[BasicExpr] =
    log("template | literal | grouped_expr") {
      template.map(BasicExpr.apply)
        .orElse(literal.map(BasicExpr.apply))
        .orElse(groupedExpr.map(BasicExpr.apply))
    }

  private def groupedExpr: Option[GroupedExpr] =
    log("grouped_expr = '(' compound_expr ')' ('grouped as' str)?") {
      Try {
          consume(LEFT_PAREN, "I expected a group to start with '('")
          val e = regex
          consume(RIGHT_PAREN, "I expected a group to end with ')'")
          val name = if (matchTokens(GROUPED_AS)) {
            Some(literal.getOrElse {
              throw error(previous(), "I expected the name of a group")
            }.value)
          } else None
          GroupedExpr(e, name)
      }.toOption
    }

  private def compoundExpr: CompoundExpr =
    log("compound_expr = prefix? expr suffix?") {
      val maybePrefix = prefix
      val definitelyExpr = basicExpr.getOrElse {
        throw error(peek(), s"I expected an expression")
      }
      val maybeSuffix = suffix
      CompoundExpr(definitelyExpr, maybePrefix, maybeSuffix)
    }

  private def conjunction: Option[Conjunction] =
    log("conjunction = 'then' | 'after' | 'and' | 'or'") {
      if (matchTokens(THEN, OR)) {
        Some(Conjunction(previous()))
      } else None
    }

  private def prefix: Option[Prefix] = log("prefix = 'maybe'") {
    if (matchTokens(MAYBE)) {
      Some(Prefix(previous()))
    } else {
      None
    }
  }

  private def suffix: Option[Suffix] = log("suffix = quantifier") {
    quantifier.map(Suffix.apply)
  }

  private def quantifier: Option[Quantifier] =
    log("quantifier = quantifier_exact | quantifier_range") {
      if (peek() == TokenType.NUMBER) {
        quantExact
      } else {
        quantRange
      }
    }

  private def quantExact: Option[QuantExact] =
    log("quantifier_exact = number 'of'") {
      Try {
        val quantToken = consume(
          TokenType.NUMBER,
          "I expected a number to specify how many times this pattern would repeat."
        )
        consume(
          TokenType.QUANT_EXACT,
          "I expected 'of' to follow a number specifying how many times this pattern would repeat."
        )
        QuantExact(parseLiteralAsNumber(quantToken, "the value before 'of'"))
      }.toOption
    }

  private def quantRange: Option[QuantRange] = log(
    "quantifier_range = 'one or more', 'zero or more' | 'between' number 'and' number"
  ) {
    peek().tokenType match {
      case TokenType.QUANT_ZERO_OR_MORE =>
        advance()
        Some(QuantRange(0))
      case TokenType.QUANT_ONE_OR_MORE =>
        advance()
        Some(QuantRange(1))
      case TokenType.QUANT_BETWEEN =>
        advance()
        val from = consume(
          TokenType.NUMBER,
          "I expected a number to specify a minimum number of times this pattern would repeat"
        )
        matchTokens(TokenType.QUANT_AND)
        val to = consume(
          TokenType.NUMBER,
          "I expected a number to specify a maximum number of times this pattern would repeat"
        )
        matchTokens(TokenType.QUANT_TIMES)
        Some(
          QuantRange(
            parseLiteralAsNumber(from, "the value after 'between'"),
            Some(parseLiteralAsNumber(to, "the value after 'and'"))
          )
        )
      case _ => None
    }
  }

  private def template: Option[Template] =
    log("template = 'word' | 'letter' | 'digit' | 'word boundary'") {
      if (matchTokens(WORD, LETTER, DIGIT, WORD_BOUNDARY, DIGIT)) {
        Some(Template(previous()))
      } else None
    }

  private def literal: Option[Literal] = log("literal = number | str") {
    if (matchTokens(NUMBER, STRING)) {
      Some(Literal(previous().literal.toString))
    } else None
  }

  // // varDecl  -> 'var' identifier ('=' expression)? ";"
  // private def varDecl =
  //   val varName = consume(IDENTIFIER, "Expected variable name")
  //   var initialisedValue = if (matchTokens(EQUAL)) expression else null
  //   consume(SEMICOLON, "Expected ';' after variable declaration")
  //   VarDecl(varName, initialisedValue)

  // // statement  -> exprStmt | printStmt | block
  // private def statement: Stmt =
  //   if (matchTokens(PRINT)) printStmt
  //   else if (matchTokens(LEFT_BRACE)) block
  //   else if (matchTokens(IF)) ifStmt
  //   else if (matchTokens(WHILE)) whileStmt
  //   else if (matchTokens(FOR)) forStmt
  //   else exprStmt

  // // whileStmt -> "while" "(" expression ")" "do" statement
  // private def whileStmt =
  //   consume(LEFT_PAREN, "Expected '(' after beginning of while statement")
  //   val expr = expression
  //   consume(RIGHT_PAREN, "Expected ')' after while statement expression")
  //   val stmt = statement
  //   WhileStmt(expr, stmt)

  // // ifStmt -> "if"  "(" expression ")" statement ("else" statement)?
  // private def ifStmt =
  //   consume(LEFT_PAREN, "Expected '(' after beginning of if statement")
  //   val expr = expression
  //   consume(RIGHT_PAREN, "Expected ')' after if statement expression")
  //   val thenStmt = statement
  //   val elseStmt =
  //     if (matchTokens(ELSE))
  //       Some(statement)
  //     else
  //       None
  //   IfStmt(expr, thenStmt, elseStmt)

  // private def forStmt =
  //   consume(LEFT_PAREN, "Expected '(' after beginning of for statement")
  //   consume(VAR, "Expected variable declaration at beginning of for statement")
  //   val decl = varDecl
  //   val comparisonExpr = comparison
  //   consume(SEMICOLON, "Expected ';' after for statement comparison")
  //   val incrementExpr = expression
  //   consume(RIGHT_PAREN, "Expected ')' after for statement expression")
  //   val stmt = statement
  //   Block(
  //     List(
  //       decl,
  //       WhileStmt(
  //         comparisonExpr,
  //         Block(List(Expression(incrementExpr), stmt))
  //       )
  //     )
  //   )

  // // block      -> "{" declaration* "}"
  // private def block: Block =
  //   var declarations = List.empty[Option[Stmt]]
  //   while (peek().tokenType != RIGHT_BRACE && !isAtEnd) {
  //     declarations = declarations :+ declaration
  //   }
  //   consume(RIGHT_BRACE, "Expected a '}' at the end of a block")
  //   Block(declarations.flatten)

  // // printStmt  -> "print" expression_list
  // private def printStmt =
  //   val expr = expressionList
  //   consume(SEMICOLON, "Expected an ';' after an expression.")
  //   Print(expr)

  // // exprStmt   -> expression_list
  // private def exprStmt =
  //   val expr = expressionList
  //   consume(SEMICOLON, "Expected an ';' after an expression.")
  //   Expression(expr)

  // // expression_list ->  expression (',' expression_list)
  // private def expressionList: ExprList =
  //   var expr = expression
  //   if (matchTokens(COMMA))
  //     ExprList(expr, Some(expressionList))
  //   else
  //     ExprList(expr)

  // // expression -> equality
  // private def expression = assignment

  // // assignment -> IDENTIFIER '=' assignment | equality
  // private def assignment =
  //   val expr = or
  //   (matchTokens(EQUAL), expr) match
  //     case (true, Variable(name)) =>
  //       Assign(name, equality)
  //     case (false, expr) => expr
  //     case _ =>
  //       throw error(previous(), s"Cannot assign to an expression")

  // // logic_or -> logic_and ("or" logic_and)*
  // private def or =
  //   val leftExpr = and
  //   if (matchTokens(OR))
  //     val operator = previous()
  //     val rightExpr = and
  //     Logical(leftExpr, operator, rightExpr)
  //   else leftExpr

  // // logic_and -> equality ("and" equality)*
  // private def and =
  //   val leftExpr = equality
  //   if (matchTokens(AND))
  //     val operator = previous()
  //     val rightExpr = equality
  //     Logical(leftExpr, operator, rightExpr)
  //   else leftExpr

  // // equality   -> comparison (('==' | '!=' comparison)*
  // private def equality =
  //   var expr = comparison
  //   while (matchTokens(BANG_EQUAL, EQUAL_EQUAL)) {
  //     val operator = previous()
  //     val right = comparison
  //     expr = Binary(expr, operator, right)
  //   }
  //   expr

  // // comparison -> term (('>' | '>=' | '<' | '<=') term)*
  // private def comparison =
  //   var expr = term
  //   while (matchTokens(LESS, LESS_EQUAL, GREATER, GREATER_EQUAL)) {
  //     val operator = previous()
  //     val right = term
  //     expr = Binary(expr, operator, right)
  //   }
  //   expr

  // // term       -> factor (("+" | "-") factor)*
  // private def term =
  //   var expr = factor
  //   while (matchTokens(PLUS, MINUS)) {
  //     val operator = previous()
  //     val right = factor
  //     expr = Binary(expr, operator, right)
  //   }
  //   expr

  // // factor     -> unary (("/" | "*") unary)*
  // private def factor =
  //   var expr = unary
  //   while (matchTokens(STAR, SLASH)) {
  //     val operator = previous()
  //     val right = unary
  //     expr = Binary(expr, operator, right)
  //   }
  //   expr

  // // unary      -> (("!" | "-") unary) | primary
  // private def unary: Expr =
  //   if (matchTokens(BANG, MINUS)) {
  //     val operator = previous()
  //     val right = unary
  //     Unary(operator, right)
  //   } else primary

  // // primary    -> number | string | true | false | Nil | "(" expression ")"
  // private def primary = () match {
  //   case () if matchTokens(FALSE)          => Literal(false)
  //   case () if matchTokens(TRUE)           => Literal(true)
  //   case () if matchTokens(NIL)            => Literal(null)
  //   case () if matchTokens(STRING, NUMBER) => Literal(previous().literal)
  //   case () if matchTokens(IDENTIFIER)     => Variable(previous())
  //   case () if matchTokens(LEFT_PAREN) =>
  //     val expr = expression
  //     consume(
  //       RIGHT_PAREN,
  //       "Expected an ')' after an expression. Did you miss a brace?"
  //     )
  //     Grouping(expr)
  //   case () => throw error(peek(), "Expected an expression.")
  // }

  private def parseLiteralAsNumber(token: Token, message: String): Int = {
    token.literal.toString().toFloatOption match {
      case Some(value) => value.toInt
      case None =>
        throw error(
          token,
          s"I expected ${message} to be a number, but I received ${token}"
        )
    }
  }

  private def matchTokens(tokens: TokenType*) =
    tokens.exists(token =>
      if (check(token)) {
        advance()
        true
      } else false
    )

  private def check(tokenType: TokenType) =
    if (isAtEnd) false else peek().tokenType == tokenType

  private def isAtEnd = peek().tokenType == EOF

  private def peek() = tokens(current)

  private def advance() =
    if (!isAtEnd) current = current + 1
    previous()

  private def consume(tokenType: TokenType, message: String) = {
    if (check(tokenType)) advance()
    else throw error(peek(), message)
  }

  private def previous() = tokens(current - 1)

  private def synchronize(): Unit =
    advance()
    while (!isAtEnd) {
      if (previous().tokenType == SEMICOLON)
        return
      if (skipTypes.contains(peek().tokenType))
        return
      advance()
    }

  def error(token: Token, message: String) =
    if (token.tokenType == EOF)
      report(token.line, " at end of file", message)
    else
      report(token.line, s" at '${token.lexeme}', position ${token.pos} (${progStr.safeSubstring(token.pos - 5, token.pos - 1)}>>>${progStr.charAt(token.pos)}<<<${progStr.safeSubstring(token.pos + 1, token.pos + 6)})", message)
    new ParseError

  def report(line: Int, location: String, message: String) =
    println(s"${message} ${location} on line ${line}")

  def log[E](grammarExpr: String)(f: => E): E =
    if (curDepth > maxDepth) throw new Error("Max recursion depth exceeded")
    curDepth = curDepth + 1
    if (debug) println(s"Parse for $grammarExpr from ${peek().tokenType}")
    val result = f
    if (debug) println(s"Result for $grammarExpr: $result")
    result

package regexlang

import TokenType._

/**
  * regex = expr*
  * expr = compound_expr | grouped_expr
  * grouped_expr = '(' regex ')' ('grouped as' str)?
  * compound_expr = prefix? basic_expr conjunction?
  * basic_expr = template | literal | grouped_expr
  * conjunction = 'then' | 'after' | 'and' | 'or'
  * prefix = 'maybe' | range
  * range = 'one or more', 'zero or more' | number 'of' | 'between' number 'and' number
  * template = 'word' | 'letter' | 'digit' | 'word boundary'
  * literal = number | str
  * str = '"' string '"'
  */

trait Regex {
  def toRegex(): String
}

case class Expr(exprs: List[BaseExpr]) {
  def toRegex() = exprs.map(_.toRegex()).mkString("")
}

case class BaseExpr(expr: CompoundExpr | GroupedExpr) extends Regex {
  def toRegex() = expr.toRegex()
}

case class GroupedExpr(expr: Expr, name: Option[String] = None) extends Regex {
  def toRegex() = s"(${name.map(n => s"?<${n}>").getOrElse("")}${expr.exprs.map(_.toRegex()).mkString("")})"
}

case class CompoundExpr(expr: BasicExpr, prefix: Option[Prefix], conjunction: Option[Conjunction]) extends Regex {
  def toRegex() = s"${prefix.map(_.toRegex()).getOrElse("")}${expr.toRegex()}${conjunction.map(_.toRegex()).getOrElse("")}"
}
case class BasicExpr(value: Template | Literal | GroupedExpr) extends Regex {
  def toRegex() = value match {
    case e: (Template | GroupedExpr) => e.toRegex()
    case l: Literal => l.value
  }
}
case class Template(token: Token) extends Regex {
  def toRegex() = token.tokenType match {
    case WORD => "\\w"
    case WORD_BOUNDARY => "\\b"
    case DIGIT => "\\d"
    case LETTER => "[a-Z]"
  }
}

case class Conjunction(token: Token) {
  def toRegex() = token.tokenType match {
    case OR => "|"
    case THEN => ""
  }
}

case class Prefix(value: Token | Range) {
  def toRegex() = value match {
    case Token(MAYBE, _, _, _) => "?"
    case Range => ???
  }
}

case class Literal(value: String)

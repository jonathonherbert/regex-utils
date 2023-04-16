package regexlang

import TokenType._

/**
  * regex = expr*
  * base_expr = compound_expr conjunction?
  * compound_expr = prefix? basic_expr suffix?
  * basic_expr = template | literal | grouped_expr
  * grouped_expr = '(' regex ')' ('grouped as' str)?
  * conjunction = 'then' | 'after' | 'and' | 'or'
  * prefix = 'maybe'
  * suffix = quantifier
  * quantifier = quantifier_exact | quantifier_range
  * quantifier_exact = number 'of'
  * quantifier_range = 'one or more', 'zero or more' | 'between' number 'and' number
  * template = 'word' | 'letter' | 'digit' | 'word boundary'
  * literal = number | str
  * str = '"' string '"'
  */

trait Regexable {
  def toRegex(): String
}

case class Expr(exprs: List[BaseExpr]) {
  def toRegex() = exprs.map(_.toRegex()).mkString("")
}

case class BaseExpr(expr: CompoundExpr | GroupedExpr | BasicExpr, conjunction: Option[Conjunction] = None) extends Regexable {
  def toRegex() = s"${expr.toRegex()}${conjunction.map(_.toRegex()).getOrElse("")}"
}

case class GroupedExpr(expr: Expr, name: Option[String] = None) extends Regexable {
  def toRegex() = s"(${name.map(n => s"?<${n}>").getOrElse("")}${expr.exprs.map(_.toRegex()).mkString("")})"
}

case class CompoundExpr(expr: BasicExpr, prefix: Option[Prefix] = None, suffix: Option[Suffix] = None) extends Regexable {
  def toRegex() = s"${prefix.map(_.toRegex(expr)).getOrElse(expr.toRegex())}${suffix.map(_.toRegex()).getOrElse("")}"
}
case class BasicExpr(value: Template | Literal | GroupedExpr) extends Regexable {
  def toRegex() = value match {
    case e: (Template | GroupedExpr) => e.toRegex()
    case l: Literal => l.toRegex()
  }
}
case class Template(token: Token) extends Regexable {
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

case class Prefix(value: Token) {
  def toRegex(expr: BasicExpr): String = value match {
    case Token(MAYBE, _, _, _, _) => s"${expr.toRegex()}?"
  }
}

case class Suffix(value: Quantifier) {
  def toRegex() = value.toRegex()
}

type Quantifier = QuantExact | QuantRange

case class QuantRange(minInclusive: Int, maxInclusive: Option[Int] = None) extends Regexable {
  def toRegex() = (minInclusive, maxInclusive) match {
    case (0, None) => "*"
    case (1, None) => "+"
    case (min, Some(max)) => s"{$min,$max}"
    case (min, None) => s"{$min,}"
  }
}

case class QuantExact(value: Int) extends Regexable {
  def toRegex() = s"{$value}"
}

case class Literal(value: String) extends Regexable {
  def toRegex() = value.map(escape).mkString("")
  val shouldEscape = Set('.', '’', '$')

  def escape(char: Char) = if (shouldEscape.contains(char)) s"\\$char" else char

}

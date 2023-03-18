package regexlang


/**
  * regex = expr*
  * expr = compound_expr | grouped_expr
  * grouped_expr = '(' regex ')' ('grouped as' str)?
  * compound_expr = prefix? basic_expr conjunction?
  * basic_expr = template | literal | grouped_expr
  * conjunction = 'then' | 'after' | 'and' | 'or'
  * prefix = 'maybe' | range
  * range = 'one or more', 'zero or more' | number 'of' | 'between' number 'and' number
  * template = 'word' | 'letter' | 'digit' | 'word boundary' | 'digit'
  * literal = number | str
  * str = '"' string '"'
  */

trait Expr

case class BaseExpr(expr: Expr) extends Expr
case class GroupedExpr(expr: List[Expr], name: Option[String] = None) extends Expr
case class CompoundExpr(expr: BasicExpr, prefix: Option[Prefix], conjunction: Option[Conjunction]) extends Expr
case class BasicExpr(expr: Template | Literal | GroupedExpr) extends Expr
case class Template(token: Token) extends Expr // This will need to be narrowed to templates only
case class Conjunction(token: Token) // As above
case class Prefix(value: Token | Range) // As above
case class Literal(value: String)

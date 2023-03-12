package regexlang

/**
  * expr = compound_expr | grouped_expr
  * grouped_expr = '(' compound_expr ')' ('grouped as' str)?
  * compound_expr = prefix? basic_expr conjunctive?
  * basic_expr = template | literal | grouped_expr
  * conjunctive = 'then' | 'after' | 'and' | 'or'
  * prefix = 'maybe' | range
  * range = 'one or more', 'zero or more' | number 'of' | 'between' number 'and' number
  * template = 'word' | 'letter' | 'digit' | 'word boundary' | 'digit'
  */

trait Expr

case class BaseExpr(left: Expr, right: Option[BaseExpr] = None) extends Expr
case class GroupedExpr(expr: CompoundExpr, name: Option[String] = None) extends Expr
case class CompoundExpr(expr: BasicExpr, prefix: Option[Prefix], conjunctive: Option[Conjunctive])
case class BasicExpr(expr: Template | Literal | GroupedExpr) extends Expr
case class Template(value: String) extends Expr // This will need to be narrowed to templates only

case class Conjunctive(value: String) // As above
case class Prefix(value: String) // As above
case class Literal(value: String)

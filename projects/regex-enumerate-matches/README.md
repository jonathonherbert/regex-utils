# regex-possibilities

List possible matches for a regular expression.

Where repeating characters are allowed, sensibly provide a subset of these expressions, traversing the tree of possibilities to produce as much breadth as reasonably possible.

For non-repeating characters, this is reasonably straightforward:

```
Camilla,? (Parker ?-?Bowles|(the)? Queen Consort)

Camilla ParkerBowles
Camilla Parker-Bowles
Camilla Parker Bowles
Camilla Parker -Bowles
Camilla  Queen Consort
Camilla the Queen Consort
Camilla, ParkerBowles
Camilla, Parker-Bowles
Camilla, Parker Bowles
Camilla, Parker -Bowles
Camilla,  Queen Consort
Camilla, the Queen Consort
```

We will need to generate a limited subset for repeated characters. For example, for the expression `a(b|B)*c`, limiting to two examples for each branch of the tree is probably sufficient:

```
ac
abc
aBc
abbc
abBc
aBbc
aBBc
```

It's interesting to consider how, given a maximum output length of e.g. 50 examples, we might bias the examples towards traversing the breadth of the tree of possibilities, whilst still maximising the number of examples.

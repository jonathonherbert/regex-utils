# regex-utils

A few experimental utilities to help read and write regular expressions, with a particular focus on users who do not write code for a living.

## Why?

Regular expressions are notoriously difficult to write and maintain, especially for newcomers:
1. The syntax is terse, and in most cases not possible to derive from plain English. For example, target users may remember that parentheses introduce a group, but are less likely to remember that `?:` marks it as non-capturing.
2. Regular expressions are expressed as linear strings, making it difficult to express structure (heirarchy, different sections) without resorting to programming techniques that are environment-dependent.
3. It's not inherently clear that an expression is correct for a given use case.

At the Guardian, we have a few tools that use regular expressions, and these tools have non-developer users:

- [Typerighter](https://github.com/guardian/typerighter) uses regular expressions as one way of matching patterns in text.
- Regular expressions are frequently useful in internal investigations to match text.

## How do we improve things?

Perhaps tooling can help. See individual projects for more information:

- [regex-lang](./projects/regex-lang/README.md), a grammar for writing regular expressions in something closer to English.
- [regex-explain](./projects/regex-lang/README.md), a program for explaining regular expressions in a way that is clearer to non-technical users.
- [regex-matches](./projects/regex-lang/README.md), a program for showing the strings, or a subset of those strings, that a regular expression can match.

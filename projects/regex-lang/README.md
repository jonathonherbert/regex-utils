
## regex-lang

`regex-lang` spikes an approach to help with [project points 1.) and 2.)](../../README.md) by providing a way of writing regular expressions that is closer to written English:
1. Because it's easier to remember `or` than `|`, or `grouped as` than `(?:`, users can more easily discover and recognise features. An intellisense environment, or something similar,  will be necessary to help the user understand what is possible in a given context.
2. Permitting newlines and indentation allows the user to structure parts of the expression in ways that more closely match its structure.

Producing something readable as the complexity of the expression grows is difficult. Consider the expression `Camilla,? (Parker ?-?Bowles|the? Queen Consort)`. To produce this expression, the current grammar looks like:

```
'Camilla' then maybe ',' then ' ' then ('Parker' then maybe ' ' then maybe '-' then 'Bowles' or maybe 'the' then ' Queen Consort')
```

Structuring this makes it slightly easier to read:

```
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
    )
```

... but only slightly, and it's up to the user to do this. Automatic formatting might be useful in ensuring structure is reflected in this way.

Ultimately, writing a language server and formatting rules requires a significant amount of engineering effort. My hunch is that expressing an [FSA](https://en.wikipedia.org/wiki/Finite-state_machine) in natural language is an inherently problematic thing to do. Perhaps a better way forward is to produce tools that help users write regexes as they are ([regex-explain](../regex-explain/README.md), [regex-possibilities](../regex-explain/README.md).)

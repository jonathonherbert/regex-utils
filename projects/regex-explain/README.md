
# regex-explain

Explain a regular expression in plain English.

For example, the regular expression "Camilla,? (Parker ?-?Bowles|the? Queen Consort)" can be explained in plain English as follows:

1. "Camilla" - This matches the literal string "Camilla".
2. ",?" - This matches zero or one comma.
2. "(Parker ?-?Bowles|the? Queen Consort)" - This is a group that matches either of the following two options:

    1. "Parker ?-?Bowles" - This matches the literal string "Parker-Bowles" with an optional space before the hyphen, and an optional hyphen.
  
    2. "the? Queen Consort" - This matches the literal string "the Queen Consort" with an optional "the" before it.

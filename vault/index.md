---
title: Filmes e Series
tags:
  - moc
  - pessoal
  - filmes
  - series
cssclasses:
  - cards
  - cards-cover
  - cards-2-3
  - table-max
description: Minha lista de filmes e series para assistir
---

```dataview
table without id
("![](" + image + ")") as Image,
titulo as Title, 
ano as Ano
from #filme or #série where image != null
```

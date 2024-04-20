# mergemate
<h2 align="center">
merge CSV files easily using this web app written in ts/preact
<img height="256" width="256" src="./src/assets/icon.svg">
</h2>

![img](./example.png)

## implemented
- CSV parsing
 - comma and newline delimiter
 - quote escaping of comma for cell values
- CSV rendering
 - sticky header row
 - key marking per sheet

## mvp-todo
- impl merge button
- merge any number of sheets greater than 1
- mark column as unique, key, exclude
- key formulas ( compare: `a.trim().toLower()==b.trim().toLower()` , output: `a.trim().toLower()`)
- merge modes:
  - union (include only rows where keys match comparison across sheets)
  - exclusion (include only keys with no match comparison across sheets)
  - union-keep (union + keep unmatched key rows)
- export and download serialized CSV
- export preview that live regenerates when options changed
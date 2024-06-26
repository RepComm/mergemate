<div align="center">

# mergemate
### easily merge CSVs
#### written in typescript using preact

<img height="256" width="256" src="./src/assets/icon.svg">
</div>

![img](./example.png)

## implemented
- CSV parsing
 - comma and newline delimiter
 - quote escaping of comma for cell values
 - converts to indexeddb store
   - fast querying
   - pagination
   - renders quickly
   - persistence across browser sessions

## mvp-todo
- mark column as key, unique, exclude
- key formula (ex: `a.trim().toLower()==b.trim().toLower()` ) 
- cell transform formula (ex: `v.trim().toLower()`)
- merge modes:
  - union (include only rows where keys match comparison across sheets)
  - exclusion (include only keys with no match comparison across sheets)
  - union-keep (union + keep unmatched key rows)
- export and download serialized CSV
- export preview that live regenerates when options changed
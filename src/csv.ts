export interface CSVRow {
	[key: string]: string;
}
export function parseCSV(csvStr: string, cb: (row: CSVRow) => void) {
	const rowDelim = "\n"
	const colDelim = ","
	const quoteDelim = "\""
	const headers = []
	let header = ""
	let headerEndIndex = 0

	let isQuoting = false

	for (let i = 0; i < csvStr.length; i++) {
		const ch = csvStr[i]
		if (ch === quoteDelim) {
			isQuoting = !isQuoting
			continue
		} else if (ch === colDelim && !isQuoting) {
			headers.push(header)
			header = ""
		} else if (ch === rowDelim) {
			headers.push(header)
			headerEndIndex = i + 1
			break
		} else {
			header += ch
		}
	}
	isQuoting = false

	let cols = []
	let col = ""
	for (let i = headerEndIndex; i < csvStr.length; i++) {
		const ch = csvStr[i]
		if (ch === quoteDelim) {
			isQuoting = !isQuoting
			continue
		} else if (ch === colDelim && !isQuoting) {
			cols.push(col)
			col = ""
		} else if (ch === rowDelim) {
			cols.push(col)

			const result = {}
			for (let j = 0; j < headers.length; j++) {
				const h = headers[j]
				const v = cols[j]
				result[h] = v
			}
			cb(result)

			cols = []
			col = ""

		} else {
			col += ch
			if (i === csvStr.length - 1) {
				cols.push(col)
				col = ""
			}
		}
	}
	if (cols.length > 0) {
		const result = {}
		for (let j = 0; j < headers.length; j++) {
			const h = headers[j]
			const v = cols[j]
			result[h] = v
		}
		cb(result)
	}

}

export interface SheetState {
	csvRows: Array<CSVRow>
	name: string
	keyColumnIndex: number
}
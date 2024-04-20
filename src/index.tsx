
import { Component, VNode, createRef, render } from 'preact';

import './style.css';

interface Props {

}
interface State {
	sheetIndex: number;
}
interface CSVRow {
	[key: string]: string;
}
function parseCSV(csvStr: string, cb: (row: CSVRow) => void) {
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

interface SheetState {
	csvRows: Array<CSVRow>
	name: string
	keyColumnIndex: number
}

interface CSVProps {
	sheet: SheetState
	key: number
}
interface CSVState {
	sheet: SheetState
}

export class CSVRenderer extends Component<CSVProps, CSVState> {
	// name: string
	// rows: Array<CSVRow>
	// keyColumnIndex: number

	constructor(props: CSVProps) {
		super(props)
		this.state = {
			sheet: props.sheet
		}
	}
	renderRow(row: CSVRow) {
		const values = Object.values(row)
		const cols = new Array(values.length)
		for (let i = 0; i < cols.length; i++) {
			const col = values[i]
			cols[i] = <td>{col}</td>
		}
		return <tr>
			{cols}
		</tr>
	}
	renderRows() {
		const results = []
		for (const row of this.state.sheet.csvRows) {
			results.push(this.renderRow(row))
		}
		return results
	}
	renderHeader(name: string, index: number) {
		if (index === this.state.sheet.keyColumnIndex) {
			return <th onClick={() => {
				this.state.sheet.keyColumnIndex = -1
				this.forceUpdate()
			}}><span class="key">Key</span>{name}</th>
		} else {
			return <th onClick={() => {
				this.state.sheet.keyColumnIndex = index
				this.forceUpdate()
			}}>{name}</th>
		}
	}
	renderHeaderRow() {
		const row0 = this.state.sheet.csvRows[0]
		const headers = []
		const keys = Object.keys(row0)
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			headers.push(this.renderHeader(key, i))
		}
		return <tr class="sticky">{headers}</tr>
	}
	render() {
		return <table class="csv-table">
			{this.renderHeaderRow()}
			{this.renderRows()}
		</table>
	}
}

export class App extends Component<Props, State> {
	sheets: Array<SheetState>

	constructor() {
		super();
		this.state = {
			sheetIndex: 0,
		}
		this.sheets = []
	}
	renderRow(row: CSVRow) {
		const values = Object.values(row)
		const cols = new Array(values.length)
		for (let i = 0; i < cols.length; i++) {
			const col = values[i]
			cols[i] = <td>{col}</td>
		}
		return <tr>
			{cols}
		</tr>
	}
	renderTabButton(name: string, tabIndex: number) {
		return <button onClick={() => {
			this.setState({ sheetIndex: tabIndex })
		}}>{name}</button>
	}
	renderTabButtons() {
		const buttons = []
		if (this.sheets) {
			for (let i = 0; i < this.sheets.length; i++) {
				const csv = this.sheets[i]
				buttons.push(this.renderTabButton(csv.name, i))
			}
		}
		return <div id="tab-buttons">{buttons}</div>
	}
	renderSheet(sheetIndex: number) {
		if (this.sheets === undefined || this.sheets.length < 1) {
			return <div>No CSVs loaded yet</div>
		}
		const idx = sheetIndex// % this.state.csvs.length
		const sheet = this.sheets[idx]
		return <div class="csv-container">
			<CSVRenderer sheet={sheet} key={idx}></CSVRenderer>
		</div>
	}
	render() {
		const fileInputRef = createRef<HTMLInputElement>();
		return <div id="container">
			<div class="toolbar">
				<div class="icon"></div>
				<input
					ref={fileInputRef}
					style="display:none;"
					type="file"
					multiple={true}
					onChange={(evt) => {
						const files = (evt.target as HTMLInputElement).files
						if (files.length < 1) return
						for (const file of files) {
							const fr = new FileReader()
							fr.onload = () => {
								const csvs = this.sheets || []
								const csvRows = []
								parseCSV(fr.result as string, (row) => {
									csvRows.push(row)
								})
								const sheet: SheetState = {
									csvRows,
									keyColumnIndex: -1,
									name: file.name
								}
								csvs.push(sheet)

								this.forceUpdate()
							}
							fr.readAsText(file)
						}
					}}></input>
				<button
					onClick={()=>{
						fileInputRef.current.click()
				}}>Import CSV</button>
				<button
					onClick={()=>{

				}}>Merge</button>
			</div>
			{this.renderTabButtons()}
			{this.renderSheet(this.state.sheetIndex)}
		</div>
	}
}

render(<App />, document.getElementById('app'));

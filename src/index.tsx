
import { Component, VNode, createRef, render } from 'preact';

import './style.css';
import { Query } from './query';
import { DB } from './db';

interface Props {

}
interface State {
	sheetIndex: number;
	showMergePanel: boolean;
	db?: DB;
	storeName?: string;
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

function fileReadAsString(file: File) {
	return new Promise<{content: string; name: string;}>(async (_resolve, _reject)=>{
		const fr = new FileReader()
		fr.onload = ()=>{
			_resolve({
				content: fr.result as string,
				name: file.name,
			})
			return
		}
		fr.onerror = (err)=> {
			_reject(err)
			return
		}
		fr.readAsText(file)
	})
}

function filesInputToStrings (inp: HTMLInputElement) {
	return new Promise<Array<{content: string; name: string;}>>(async (_resolve, _reject)=>{
		if (inp.files.length < 1) {
			_reject("no files")
			return
		}
		const result = new Array()
		for (const file of inp.files) {
			try {
				const csvStr = await fileReadAsString(file)
				result.push(csvStr)
			} catch (ex) {
				//ignore for now
			}
		}
		_resolve(result)
	})
}

indexedDB.deleteDatabase("mergemate")

export class App extends Component<Props, State> {
	sheets: Array<SheetState>

	constructor() {
		super();
		this.state = {
			sheetIndex: 0,
			showMergePanel: false,
		}
	}
	componentWillMount(): void {
		this.ensureDB()
	}
	clear() {
		this.setState({
			db: undefined,
			storeName: undefined
		})
		indexedDB.deleteDatabase("mergemate")
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
	renderMergePanel() {
		let c = "merge-panel"
		if (!this.state.showMergePanel) c += " hide";
		return <div class={c}>
			<div class="row">
				<button class="close" onClick={() => {
					this.setState({ showMergePanel: false })
				}}>Close</button>
			</div>

		</div>
	}
	/**creates a store from the sheet*/
	async dbSheetInsert (sheet: SheetState) {
		const db = this.state.db
		
		const storeName = sheet.name
		await db.createStore(storeName)
		const store = db.getStore(storeName)

		const first = sheet.csvRows[0]
		const keys = Object.keys(first)
		const key = keys[0]

		for (const row of sheet.csvRows) {
			store.put(row, row[key])
		}
	}
	/**Update the index of the sheet's store
	 * if sheet.keyColumnIndex === -1 it deletes the index
	*/
	async dbSheetIndex (sheet: SheetState) {
		const db = this.state.db
		if (sheet.keyColumnIndex === -1) {
			await db.storeDeleteIndex(sheet.name)
		} else {
			const first = sheet.csvRows[0]
			const keys = Object.keys(first)
			const keyPath = keys[sheet.keyColumnIndex]
			await db.storeCreateIndex(sheet.name, keyPath)
		}
	}
	async ensureStoreName () {
		const db = this.state.db
		if (!db) return
		
		const storeNames = db.db.objectStoreNames
		let storeName = undefined
		if (storeNames.length > 0) storeName = storeNames[0]

		this.setState({
			storeName,
		})
		this.forceUpdate()
	}
	async ensureDB () {
		if (!this.state.db) {
			const db = await DB.open("mergemate")

			this.setState({
				db
			})
			await this.ensureStoreName()
		}
	}
	renderImporter() {
		const fileInputRef = createRef<HTMLInputElement>();
		return <div
			class="importer"
			style="height:100%;float:left;"
			>
			<input
				ref={fileInputRef}
				style="display:none;"
				type="file"
				multiple={true}
				onChange={async (evt) => {
					await this.ensureDB()

					const fs = await filesInputToStrings(
						evt.target as HTMLInputElement
					)

					for (const f of fs) {
						const csvRows = []
						parseCSV(f.content, (row) => {
							csvRows.push(row)
						})
						const sheet: SheetState = {
							keyColumnIndex: -1,
							csvRows,
							name: f.name,
						}
						await this.dbSheetInsert(sheet)
					}

					// setTimeout(()=>{
						this.ensureStoreName()
					// }, 1000)

				}}></input>
			<button
				class="tool"
				onClick={() => {
					fileInputRef.current.click()
				}}>Import CSV</button>
		</div>
	}
	render() {
		return <div id="container">
			<div class="toolbar">
				<div class="icon"></div>
				{this.renderImporter()}
				<button
					class="tool"
					onClick={() => {
						this.setState({
							showMergePanel: !this.state.showMergePanel
						})
					}}>Merge</button>
			</div>
			{this.renderTabButtons()}
			{this.renderMergePanel()}
			<Query
				key={this.state.storeName}
				db={this.state.db} storeName={this.state.storeName}></Query>
		</div>
	}
}

render(<App />, document.getElementById('app'));

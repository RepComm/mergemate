
import { Component, VNode, createRef, render } from 'preact';

import './style.css';
import { Query } from './query';
import { DB } from './db';
import { SheetState, CSVRow, parseCSV } from './csv';

interface Props {

}
interface State {
	// sheetIndex: number;
	showMergePanel: boolean;
	db?: DB;
	storeName?: string;
}

function fileReadAsString(file: File) {
	return new Promise<{ content: string; name: string; }>(async (_resolve, _reject) => {
		const fr = new FileReader()
		fr.onload = () => {
			_resolve({
				content: fr.result as string,
				name: file.name,
			})
			return
		}
		fr.onerror = (err) => {
			_reject(err)
			return
		}
		fr.readAsText(file)
	})
}

function filesInputToStrings(inp: HTMLInputElement) {
	return new Promise<Array<{ content: string; name: string; }>>(async (_resolve, _reject) => {
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

const MMOUTPUT = "__mergemate::output__"

export class App extends Component<Props, State> {

	constructor() {
		super();
		this.state = {
			// sheetIndex: 0,
			showMergePanel: false,
		}
	}
	componentWillMount(): void {
		this.ensureDB()
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
	renderTabButton(storeName: string) {
		return <button onClick={() => {
			this.setState({ storeName })
		}}>{storeName}</button>
	}
	renderTabButtons() {
		const buttons = []
		const db = this.state.db
		if (!db) return buttons
		const storeNames = db.db.objectStoreNames

		if (storeNames.length < 0) return buttons

		for (const storeName of storeNames) {
			if (storeName === MMOUTPUT) continue;
			buttons.push(this.renderTabButton(storeName))
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
	async dbSheetInsert(sheet: SheetState) {
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
	async dbSheetIndex(sheet: SheetState) {
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
	async ensureStoreName() {
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
	async ensureDB() {
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

					this.ensureStoreName()

				}}></input>
			<button
				class="tool"
				onClick={() => {
					fileInputRef.current.click()
				}}>Import CSVs</button>
		</div>
	}
	render() {
		return <div id="container">
			<div class="toolbar">
				<div class="icon"></div>
				{this.renderImporter()}
				
				<button
					class="tool"
					onClick={async () => {
						await this.state.db.clear()
						this.setState({
							storeName: undefined,
						})
					}}>Clear</button>
			</div>
			{this.renderTabButtons()}
			<Query
				key={this.state.storeName}
				db={this.state.db}
				storeName={this.state.storeName}>
			</Query>
			<Query
				key={MMOUTPUT}
				db={this.state.db}
				storeName={MMOUTPUT}>
			</Query>
		</div>
	}
}

render(<App />, document.getElementById('app'));

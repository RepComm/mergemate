
import { Component } from "preact";
import { DB } from "./db";

interface Props {
  db?: DB;
  storeName?: string;
}
interface State {
  db?: DB;
  storeName?: string;
  pageIndex: number;
  count: number;
  page?: Array<any>;
  storeMax?: number;
}

export class Query extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      pageIndex: 0,
      count: 5,
      db: props.db,
      storeName: props.storeName,
    }
    if (this.state.db) {
      this.updateDataView(this.state.pageIndex, this.state.count)
    }
  }
  cachedStore: IDBObjectStore;

  getStore(id: string) {
    if (this.cachedStore === undefined || this.cachedStore.name !== id) {
      const t = this.state.db.db.transaction(id)
      this.cachedStore = t.objectStore(id)
    }
    return this.cachedStore;
  }

  renderHeadersRow() {
    if (this.state.page === undefined) {
      return <tr><th>No Page</th></tr>
    } else if (this.state.page.length < 1) {
      return <tr><th>No Rows</th></tr>
    }
    const first = this.state.page[0]
    const keys = Object.keys(first)
    const headers = new Array(keys.length)
    for (let i = 0; i < keys.length; i++) {
      headers[i] = <th>{keys[i]}</th>
    }
    return <tr class="sticky">{headers}</tr>
  }
  renderCell(data: string) {
    return <td>{data}</td>
  }
  renderRow(row: any, keys: string[]) {
    const cells = new Array(keys.length)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      cells[i] = this.renderCell(row[key])
    }
    return <tr>{cells}</tr>
  }
  renderRows() {
    if (this.state.page === undefined) {
      return <tr><td></td></tr>
    } else if (this.state.page.length < 1) {
      return <tr><td></td></tr>
    }
    const first = this.state.page[0]
    const keys = Object.keys(first)

    const rows = new Array(this.state.page.length)

    for (let i = 0; i < this.state.page.length; i++) {
      const row = this.state.page[i]

      rows[i] = this.renderRow(row, keys)
    }

    return rows
  }

  async updateDataView(pageIndex: number, count: number) {
    if (!this.state.storeName) return
    const db = this.state.db
    const page = await db.page(this.state.storeName, pageIndex, count)
    const storeMax = await db.count(this.state.storeName)

    this.setState({
      page,
      pageIndex,
      count,
      storeMax,
    })
  }
  render() {
    let maxPage = undefined
    if (this.state.storeMax !== undefined) {
      maxPage = Math.floor(this.state.storeMax / this.state.count)
    }
    return <div class="query-container">
      <div class="row">
        <label>Page</label>
        <input
          class="query-input-page"
          type="number"
          step="1"
          min="0"
          value={this.state.pageIndex}
          max={maxPage}
          onChange={(evt) => {
            const target: HTMLInputElement = evt.target as any;
            const pageIndex = Math.max(
              0,
              target.valueAsNumber
            )
            this.updateDataView(pageIndex, this.state.count)
          }}
        ></input>
        <span style="margin-right:3em;">{`/ ${maxPage}`}</span>
        <label>Count</label>
        <input
          type="number"
          step="1"
          min="1"
          max={this.state.storeMax}
          value={this.state.count}
          onChange={(evt) => {
            const target: HTMLInputElement = evt.target as any;
            const count = Math.max(
              1,
              Math.min(
                target.valueAsNumber,
                100
              )
            )
            this.updateDataView(this.state.pageIndex, count)
          }}
        ></input>
        <span style="margin-right:3em;">{`/ ${this.state.storeMax}`}</span>
      </div>
      <div class="csv-container">
        <table class="query-output">
          {this.renderHeadersRow()}
          {this.renderRows()}
        </table>
      </div>
    </div>
  }
}

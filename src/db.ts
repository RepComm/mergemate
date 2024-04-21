
/**A wrapper around IDBDatabase because it is dumb*/
export class DB {
  db: IDBDatabase;
  private constructor() {

  }
  static open(name: string) {
    return new Promise<DB>(async (resolve, reject) => {
      const req = indexedDB.open(name)
      req.addEventListener("success", (evt) => {
        const result = new DB()
        //@ts-ignore
        result.db = evt.target.result
        resolve(result)
      }, { once: true })
      req.onupgradeneeded = (evt)=>{
      }
      req.addEventListener("error", (evt) => {
        reject(evt)
      }, { once: true })
    })
  }
  /**do things that normally require upgradeneeded and bs state management
   * 
   * who designed this fucking API
  */
  bullshit<T>(cb: (db: IDBDatabase) => T) {
    return new Promise<T>(async (resolve, reject) => {
      this.db.close()
      const req = indexedDB.open(this.db.name, this.db.version + 1)
      
      let result: T = undefined;

      req.onsuccess = (evt) => {
        //@ts-ignore
        const db: IDBDatabase = evt.target.result
        this.db = db
        resolve(result)
      }
      req.onupgradeneeded = (evt) => {
        //@ts-ignore
        const db: IDBDatabase = evt.target.result
        this.db = db
        result = cb(db)
        // resolve(cb(db))
      }
      req.onerror = (evt) => {
        reject(evt)
        return
      }
      // req.addEventListener("success", onSuccess, { once: true })
      // req.addEventListener("error", onError, { once: true })
      // req.addEventListener("upgradeneeded", onUpgrade, { once: true })
    })
  }
  createStore(name: string) {
    return this.bullshit((db)=>{
      db.createObjectStore(name)
    })
  }
  deleteStore (name: string) {
    return this.bullshit((db)=>{
      db.deleteObjectStore(name)
    })
  }
  clear () {
    return this.bullshit((db)=>{
      for (const storeName of db.objectStoreNames) {
        db.deleteObjectStore(storeName)
      }
    })
  }
  /**Set an index, don't worry about version control / db upgrading*/
  storeCreateIndex (name: string, keyPath: string, indexName: string = "index") {
    return this.bullshit(
      (db)=>db.transaction(name)
      .objectStore(name)
      .createIndex(indexName, keyPath)
    )
  }
  /**Delete an index, don't worry about version control / db upgrading*/
  storeDeleteIndex(name: string, indexName: string = "index") {
    return this.bullshit(
      (db)=>db.transaction(name)
      .objectStore(name)
      .deleteIndex(indexName)
    )
  }
  getStore(name: string) {
    return this.db.transaction(name, "readwrite").objectStore(name)
  }
  /**use a cursor with less code*/
  cursor (storeName: string, cb: (cursor: IDBCursorWithValue)=>void) {
    const store = this.getStore(storeName)
    
    const req = store.openCursor()
    req.addEventListener("success", (evt)=>{
      //@ts-ignore
      const cursor = evt.target.result as IDBCursorWithValue
  
      cb(cursor)
    })
  }
  count (storeName: string) {
    return new Promise<number>((resolve, reject)=>{
      const req = this.getStore(storeName).count()
      req.onsuccess = (evt)=>{
        //@ts-ignore
        resolve(evt.target.result as number)
        return
      }
      req.onerror = (evt)=>{
        reject(evt)
        return
      }
    })
  }
  /**Get a 'page' of rows from a store in the db
   * internally uses a cursor and advances (skips) rows to get to the page
   * returns as many rows as possible up to count
  */
  page(storeName: string, page: number, count: number) {
    return new Promise<Array<any>>(async (_resolve, _reject) => {
      let skippedPages = false
      let counter = 0

      const results = []
      
      const max = await this.count(storeName)

      this.cursor(storeName, (cursor)=>{
        
        if (!cursor) {
          _resolve(results)
          return
        }
        
        if (!skippedPages) {
          const skipCount = page * count
          skippedPages = true
          if (skipCount > 0) {
            if (skipCount > max) {
              _resolve(results)
              return
            }
            cursor.advance(skipCount)
            return
          }
        }
        results.push(cursor.value)
        counter++
        if (counter < count) {
          try {
            cursor.continue()
          } catch (ex) {
            console.warn("2", ex)
            _resolve(results)
            return
          }
        } else {
          _resolve(results)
          return
        }
      })

    })
  }
}

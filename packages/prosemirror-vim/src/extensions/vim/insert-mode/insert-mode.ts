export interface VimRepeatableAction {
  type:
    | 'command'
    | 'operator-linewise'
    | 'operator-motion'
    | 'operator-textobject'
    | 'insert-command'
  key: string
  count: number
  operator?: 'd' | 'y' | 'c'
  motion?: string
  findChar?: string
  findMotion?: 'f' | 'F' | 't' | 'T'
  textObject?: { type: 'i' | 'a'; object: string }
  insertedText?: string
  replaceChar?: string
}


// TODO add docs
export interface VimInsertModeState {
  action: VimRepeatableAction | null
  isTrackingInsert: boolean
  insertTextBuffer: string
}


export function insertMode(){
}

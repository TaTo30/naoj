import { EditorState, Transaction, TextSelection } from 'prosemirror-state'
import { VimState } from './types'
import { lineBounds } from './utils'

/**
 * Update the visual selection based on anchor and new head position.
 */


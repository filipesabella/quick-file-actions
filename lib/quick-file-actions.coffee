QuickFileActionsView = require './quick-file-actions-view'
{CompositeDisposable} = require 'atom'
fs_plus = require 'fs-plus'
fs_extra = require 'fs-extra'

module.exports = QuickFileActions =
  quickFileActionsView: null
  modalPanel: null
  subscriptions: null

  config:
    confirmOnDelete:
      type: 'boolean'
      default: true
    confirmOnReplace:
      type: 'boolean'
      default: true

  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @quickFileActionsView = new QuickFileActionsView(disposeAction)

    disposeAction = =>
      @modalPanel?.destroy()
      atom.workspace.getActivePane().activate()

    withDispose = (fn) =>
      (oldPath, newPath) ->
        fn(oldPath, newPath)
        disposeAction()

    showModalWith = (callback, textFn) =>
      =>
        path = atom.workspace.getActivePaneItem()?.getPath?()

        if !path
          return

        @modalPanel = atom.workspace.addModalPanel(
          item: @quickFileActionsView.getElement(textFn(path), path, callback),
          visible: true
        )
        @quickFileActionsView.focus()

    addSubscription = (action, callback, textFn) =>
      @subscriptions.add(atom.commands.add(
        'atom-workspace',
        'quick-file-actions:' + action,
        showModalWith(callback, textFn)))

    addSubscription('move', withDispose(move), (path) -> "Move #{path} to")
    addSubscription('copy', withDispose(copy), (path) -> "Copy #{path} to")
    addSubscription('delete', withDispose(remove), (_) -> 'Path to delete')

  deactivate: ->
    @modalPanel?.destroy()
    @subscriptions?.dispose()
    @quickFileActionsView?.destroy()

  serialize: ->

move = (oldPath, newPath) ->
  fs_plus.moveSync(oldPath, newPath)

remove = (oldPath, newPath) ->
  doRemove = -> fs_plus.removeSync(newPath)

  if (atom.config.get('quick-file-actions.confirmOnDelete') == true)
    atom.confirm
      message: 'Please confirm deleting ' + newPath
      buttons:
        Yes: doRemove
        Cancel: ->
  else
    doRemove()

copy = (oldPath, newPath) ->
  if (oldPath == newPath)
    return

  doCopy = =>
    fs_extra.copySync(oldPath, newPath)
    atom.workspace.open(newPath)

  if (fs_plus.existsSync(newPath) && atom.config.get('quick-file-actions.confirmOnReplace') == true)
    atom.confirm
      message: 'Destination file already exists, override?'
      buttons:
        Yes: -> doCopy()
        Cancel: ->
  else
    doCopy()

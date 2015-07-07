module.exports =
class QuickFileActionsView
  constructor: (disposeAction) ->
    @disposeAction = disposeAction

  destroy: ->
    @element?.remove()

  focus: ->
    @input.focus()
    @input.getModel().scrollToScreenPosition([0, 10000])

  getElement: (text, path, callback) ->
    @element = document.createElement('form')

    atom.commands.add(@element,
      'core:confirm': (event) =>
        oldPath = path
        newPath = event.target.getModel().getText()
        callback(oldPath, newPath)
      'core:cancel': (event) =>
        @disposeAction()
    )

    label = document.createElement('label')
    label.textContent = text

    @input = document.createElement('atom-text-editor')
    @input.setAttribute('mini', true)
    @input.getModel().setText(path)
    @input.onblur = @disposeAction

    @element.appendChild(label)
    @element.appendChild(@input)

    @element

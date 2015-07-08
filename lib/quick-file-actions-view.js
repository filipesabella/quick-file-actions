module.exports = function QuickFileActionsView(disposeAction) {
  var element, input;

  return {
    destroy: function () {
      element && element.remove();
    },

    focus: function () {
      input.focus();
      input.getModel().scrollToScreenPosition([0, 10000]);
    },

    getElement: function (text, path, callback) {
      element = document.createElement('form');
      input = document.createElement('atom-text-editor');
      var label = document.createElement('label');

      atom.commands.add(element, {
        'core:confirm': function (event) {
          oldPath = path;
          newPath = event.target.getModel().getText();
          return callback(oldPath, newPath)
        },
        'core:cancel': function (event) {
          return disposeAction();
        }
      })

      label.textContent = text;

      input.setAttribute('mini', true);
      input.getModel().setText(path);
      // setTimeout here as when not present it messes up the order of things
      // and throws exceptions.
      input.onblur = function () { window.setTimeout(disposeAction, 1) };

      element.appendChild(label);
      element.appendChild(input);

      return element;
    }
  }
}
